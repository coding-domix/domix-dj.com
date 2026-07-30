(function () {
    var body = document.body;
    var revealSelector = body.dataset.revealSelector;
    var shouldWaitForLoad = body.dataset.revealOnLoad === 'true';
    var shouldUnlockPage = body.dataset.pageLoader === 'true';

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

    function initializePage() {
        initializeRevealSections();
        if (shouldUnlockPage) {
            window.setTimeout(unlockPage, 80);
        }
    }

    if (shouldWaitForLoad) {
        window.addEventListener('load', initializePage, { once: true });
    } else {
        initializePage();
    }

    if (shouldUnlockPage) {
        window.setTimeout(unlockPage, 7000);
    }
})();
