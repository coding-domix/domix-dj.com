(function () {
    var body = document.body;
    var revealSelector = body.dataset.revealSelector;
    var shouldWaitForLoad = body.dataset.revealOnLoad === 'true';
    var shouldUnlockPage = body.dataset.pageLoader === 'true';
    var preloadCache = window.DOMIX_PRELOADED_IMAGES = window.DOMIX_PRELOADED_IMAGES || new Map();

    function unlockPage() {
        document.documentElement.classList.remove('page-loading');
        document.documentElement.classList.remove('page-loader-pending');
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

    function initializeSoundCloudEmbeds() {
        document.querySelectorAll('[data-soundcloud-src]').forEach(function (placeholder) {
            var button = placeholder.querySelector('.soundcloud-consent-button');
            if (!button) return;

            button.addEventListener('click', function () {
                var iframe = document.createElement('iframe');
                iframe.title = placeholder.dataset.soundcloudTitle || 'SoundCloud player';
                iframe.width = '100%';
                iframe.height = '166';
                iframe.scrolling = 'no';
                iframe.frameBorder = '0';
                iframe.allow = 'autoplay; encrypted-media';
                iframe.src = placeholder.dataset.soundcloudSrc;
                placeholder.replaceWith(iframe);
            }, { once: true });
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

    function createHeaderPreloadContext() {
        var header = document.querySelector('header');
        if (!header) return null;

        var domImages = prepareHeaderImages(header);
        var urls = collectHeaderImageUrls(header, domImages);
        var domUrls = new Set(domImages.map(function (image) {
            return image.currentSrc || image.src;
        }).filter(Boolean));
        var headerAssetUrls = Array.from(urls).filter(function (url) {
            return !domUrls.has(url);
        });
        return {
            domImages: domImages,
            urls: Array.from(urls),
            headerAssetUrls: headerAssetUrls
        };
    }

    function isImageCached(url) {
        return fetch(url, {
            cache: 'only-if-cached',
            mode: 'same-origin'
        }).then(function (response) {
            return response.ok;
        }).catch(function () {
            return false;
        });
    }

    function areHeaderImagesCached(context) {
        if (!context || !context.urls.length) return Promise.resolve(true);

        return Promise.all(context.urls.map(isImageCached)).then(function (results) {
            return results.every(Boolean);
        });
    }

    function preloadHeaderImages(context, cacheHit) {
        if (!context) return Promise.resolve();

        var status = window.DOMIX_HEADER_PRELOAD_STATUS = {
            complete: false,
            cacheHit: cacheHit,
            total: context.domImages.length + context.headerAssetUrls.length,
            loaded: 0,
            failed: 0,
            urls: context.urls
        };
        document.documentElement.dataset.preloadState = 'loading';
        document.documentElement.dataset.preloadTotal = String(status.total);
        document.documentElement.dataset.preloadLoaded = '0';
        document.documentElement.dataset.preloadFailed = '0';
        document.documentElement.dataset.preloadCacheHit = String(cacheHit);
        var imagePromises = context.domImages.map(function (image) {
            return waitForDomImage(image, status);
        }).concat(context.headerAssetUrls.map(function (url) {
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
        initializeSoundCloudEmbeds();

        if (!shouldUnlockPage) return;

        var context = createHeaderPreloadContext();
        areHeaderImagesCached(context).then(function (cacheHit) {
            if (!cacheHit) {
                document.documentElement.classList.add('page-loading');
                document.documentElement.dataset.preloadLoaderShown = 'true';
                document.documentElement.classList.remove('page-loader-pending');
            } else {
                document.documentElement.dataset.preloadLoaderShown = 'false';
            }
            return preloadHeaderImages(context, cacheHit);
        }).then(function () {
            revealLoadedPage();
        });
    }

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
