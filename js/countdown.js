(function () {
    'use strict';

    // Release schedule: change this single ISO timestamp when the launch date is finalized.
    // The explicit +02:00 offset defines Central European Summer Time unambiguously.
    const LAUNCH_AT = '2026-08-12T14:00:00+02:00';

    // RELEASE CHECKLIST: set this to the final homepage URL before enabling the launch state.
    // It intentionally stays empty on the temporary branch so ENTER WEBSITE cannot loop
    // back to this countdown page. The button remains visible but disabled until configured.
    const ENTER_WEBSITE_URL = '';

    const launchTime = new Date(LAUNCH_AT).getTime();
    const countdown = document.getElementById('countdown');
    const launchMessage = document.getElementById('launch-message');
    const enterWebsite = document.getElementById('enter-website');
    const units = {
        days: document.getElementById('days'),
        hours: document.getElementById('hours'),
        minutes: document.getElementById('minutes'),
        seconds: document.getElementById('seconds')
    };

    function pad(value) {
        return String(value).padStart(2, '0');
    }

    function setUnit(name, value) {
        units[name].textContent = pad(value);
        document.getElementById(`${name}-unit`).setAttribute(
            'aria-label',
            `${value} ${name}`
        );
    }

    function showLaunchState() {
        countdown.hidden = true;
        launchMessage.hidden = false;

        if (ENTER_WEBSITE_URL) {
            enterWebsite.href = ENTER_WEBSITE_URL;
        } else {
            enterWebsite.setAttribute('aria-disabled', 'true');
            enterWebsite.setAttribute('title', 'Final website URL will be added at release.');
        }
    }

    function updateCountdown() {
        const remaining = Math.max(0, launchTime - Date.now());
        const totalSeconds = Math.floor(remaining / 1000);

        setUnit('days', Math.floor(totalSeconds / 86400));
        setUnit('hours', Math.floor((totalSeconds % 86400) / 3600));
        setUnit('minutes', Math.floor((totalSeconds % 3600) / 60));
        setUnit('seconds', totalSeconds % 60);

        if (remaining <= 0) {
            showLaunchState();
            return false;
        }

        return true;
    }

    if (Number.isNaN(launchTime)) {
        throw new Error('Invalid DOMIX launch timestamp. Check LAUNCH_AT in js/countdown.js.');
    }

    if (ENTER_WEBSITE_URL) {
        enterWebsite.href = ENTER_WEBSITE_URL;
    }

    if (updateCountdown()) {
        const intervalId = window.setInterval(function () {
            if (!updateCountdown()) {
                window.clearInterval(intervalId);
            }
        }, 1000);
    }
}());
