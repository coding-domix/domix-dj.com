(function () {
    var body = document.body;
    var revealSelector = body.dataset.revealSelector;
    var shouldWaitForLoad = body.dataset.revealOnLoad === 'true';
    var shouldUnlockPage = body.dataset.pageLoader === 'true';
    var preloadCache = window.DOMIX_PRELOADED_IMAGES = window.DOMIX_PRELOADED_IMAGES || new Map();

    function unlockPage() {
        document.documentElement.classList.remove('page-loading');
    }

    function initializeRevealSections() {
        if (!revealSelector) return;

        var sections = document.querySelectorAll(revealSelector);
        var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!('IntersectionObserver' in window) || reducedMotion) {
            sections.forEach(function (section) {
                section.classList.add('is-visible');
            });
            return;
        }

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            });
        }, {
            threshold: Number(body.dataset.revealThreshold || 0.12),
            rootMargin: body.dataset.revealRootMargin || '0px'
        });

        sections.forEach(function (section) {
            observer.observe(section);
        });
    }

    function addCssImageUrls(value, urls) {
        if (!value || value === 'none') return;

        var urlPattern = /url\(\s*(['"]?)(.*?)\1\s*\)/g;
        var match;
        while ((match = urlPattern.exec(value))) {
            if (!match[2] || match[2].startsWith('data:') || match[2].startsWith('blob:')) continue;
            urls.add(new URL(match[2], document.baseURI).href);
        }
    }

    function collectComputedStyleImages(root, urls) {
        var properties = ['backgroundImage', 'maskImage', 'webkitMaskImage', 'content'];
        var elements = [root].concat(Array.from(root.querySelectorAll('*')));

        elements.forEach(function (element) {
            ['', '::before', '::after'].forEach(function (pseudoElement) {
                var styles = window.getComputedStyle(element, pseudoElement || null);
                properties.forEach(function (property) {
                    addCssImageUrls(styles[property], urls);
                });
            });
        });
    }

    function prepareHeaderImages(header) {
        return Array.from(header.querySelectorAll('img')).map(function (image) {
            image.loading = 'eager';
            return image;
        }).filter(function (image) {
            return Boolean(image.currentSrc || image.getAttribute('src'));
        });
    }

    function collectHeaderImageUrls(header, domImages) {
        var urls = new Set();

        domImages.forEach(function (image) {
            var source = image.currentSrc || image.src || image.dataset.src;
            if (source) urls.add(new URL(source, document.baseURI).href);
        });

        document.querySelectorAll('link[rel="preload"][as="image"]').forEach(function (link) {
            if (link.href) urls.add(link.href);
        });

        collectComputedStyleImages(header, urls);
        return urls;
    }

    function decodeImage(image) {
        if (!image.decode) return Promise.resolve();
        return image.decode().catch(function () {
            return undefined;
        });
    }

    function waitForDomImage(image, status) {
        return new Promise(function (resolve) {
            function finish(didFail) {
                if (didFail) {
                    status.failed += 1;
                } else {
                    status.loaded += 1;
                }
                document.documentElement.dataset.preloadLoaded = String(status.loaded);
                document.documentElement.dataset.preloadFailed = String(status.failed);
                decodeImage(image).finally(resolve);
            }

            if (image.complete) {
                finish(!image.naturalWidth);
                return;
            }

            image.addEventListener('load', function () {
                finish(false);
            }, { once: true });
            image.addEventListener('error', function () {
                finish(true);
            }, { once: true });
        });
    }

    function preloadImageUrl(url, status) {
        var cachedImage = preloadCache.get(url);
        if (cachedImage) {
            return waitForDomImage(cachedImage, status);
        }

        var image = new Image();
        image.decoding = 'async';
        preloadCache.set(url, image);
        image.src = url;
        return waitForDomImage(image, status);
    }

    function preloadHeaderImages() {
        var header = document.querySelector('header');
        if (!header) return Promise.resolve();

        var domImages = prepareHeaderImages(header);
        var urls = collectHeaderImageUrls(header, domImages);
        var domUrls = new Set(domImages.map(function (image) {
            return image.currentSrc || image.src;
        }).filter(Boolean));
        var headerAssetUrls = Array.from(urls).filter(function (url) {
            return !domUrls.has(url);
        });
        var status = window.DOMIX_HEADER_PRELOAD_STATUS = {
            complete: false,
            total: domImages.length + headerAssetUrls.length,
            loaded: 0,
            failed: 0,
            urls: Array.from(urls)
        };
        document.documentElement.dataset.preloadState = 'loading';
        document.documentElement.dataset.preloadTotal = String(status.total);
        document.documentElement.dataset.preloadLoaded = '0';
        document.documentElement.dataset.preloadFailed = '0';
        var imagePromises = domImages.map(function (image) {
            return waitForDomImage(image, status);
        }).concat(headerAssetUrls.map(function (url) {
            return preloadImageUrl(url, status);
        }));
        var fontPromise = document.fonts ? document.fonts.ready.catch(function () {}) : Promise.resolve();

        return Promise.all(imagePromises.concat(fontPromise)).then(function () {
            status.complete = true;
            document.documentElement.dataset.preloadState = 'complete';
            document.dispatchEvent(new CustomEvent('domix:header-ready', { detail: status }));
        });
    }

    function revealLoadedPage() {
        window.requestAnimationFrame(function () {
            window.requestAnimationFrame(unlockPage);
        });
    }

    function initializePage() {
        initializeRevealSections();

        if (!shouldUnlockPage) return;

        preloadHeaderImages().then(revealLoadedPage);
    }

    function isInternalPageNavigation(link, event) {
        if (!link || link.target || link.hasAttribute('download')) return false;
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;

        var destination = new URL(link.href, document.baseURI);
        if (destination.origin !== window.location.origin) return false;
        if (!/(?:\/|\.html)$/i.test(destination.pathname)) return false;

        var currentPage = window.location.origin + window.location.pathname + window.location.search;
        var destinationPage = destination.origin + destination.pathname + destination.search;
        return destinationPage !== currentPage;
    }

    document.addEventListener('click', function (event) {
        var link = event.target.closest('a[href]');
        if (!isInternalPageNavigation(link, event)) return;

        event.preventDefault();
        document.documentElement.classList.add('page-loading');
        window.requestAnimationFrame(function () {
            window.location.href = link.href;
        });
    });

    window.addEventListener('pageshow', function (event) {
        if (event.persisted && window.DOMIX_HEADER_PRELOAD_STATUS && window.DOMIX_HEADER_PRELOAD_STATUS.complete) {
            unlockPage();
        }
    });

    if (shouldWaitForLoad && !shouldUnlockPage) {
        window.addEventListener('load', initializePage, { once: true });
    } else {
        initializePage();
    }
})();
