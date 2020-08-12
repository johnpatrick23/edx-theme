/* Microsoft customization: Adding cookie related JS functions */

oxa = window.oxa || {};

(function (namespace) {
    namespace.cookieBanner = cookieBanner;
    var proto = cookieBanner.prototype;
    proto.consentCookieName = "cookie-banner";
    proto.localStoreMarketingKey = 'MarketingCampaign';

    // constructor
    function cookieBanner() { };

    // initialize the cookie consent api values
    proto.init = function (cookieValues) {
        try {
            if (proto.Error == null && cookieValues != null) {
                // TODO:Check for each and every value availability, if missing value, just use our banner
                proto.IsConsentRequired = cookieValues.IsConsentRequired;
                proto.CookieName = cookieValues.CookieName;
                proto.Css = cookieValues.Css[0];
                proto.Domain = cookieValues.Domain;
                proto.Js = cookieValues.Js[0];
                proto.Locale = cookieValues.Locale;
                proto.Markup = cookieValues.Markup;
                proto.Error = cookieValues.Error;
                proto.MinimumConsentDate = new Date(cookieValues.MinimumConsentDate).getTime();
            }
        }
        catch (error) {
        }
    };

    // Loads the Cookie API JS
    // cache:false, causes the timestamp parameters to be added on the js, where the service is not accepting currently
    proto.LoadJSCookieAPI = function (url, options) {
        // Allow user to set any option except for dataType, cache, and url
        options = $.extend(options || {}, {
            dataType: "script",
            cache: true,
            url: url
        });
        return jQuery.ajax(options);
    };

    // Adds function BI cookies
    proto.addBICookies = function () {
        // Allow BI cookies
        (function (a, b, c, d) {
            a = '//tags.tiqcdn.com/utag/msft/lex-openedx/prod/utag.js';
            b = document;
            c = 'script';
            d = b.createElement(c);
            d.src = a;
            d.type = 'text/java' + c;
            d.async = true;
            a = b.getElementsByTagName(c)[0];
            a.parentNode.insertBefore(d, a);
        })();
    };

    // set the time that consent is given
    proto.setConsentTime = function () {
        var d = new Date();
        proto.setCookie(proto.consentCookieName, d.getTime(), 13 * 30);
    }

    // sets the cookie given name, value and expiration days
    // it sets the cookie for all the sub pages of the site
    proto.setCookie = function (cname, cvalue, exdays) {
        var d = new Date();
        d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
        var expires = "expires=" + d.toUTCString();
        // Need to set the path of the cookie so that it is accessible from the successor pages.
        // Otherwise the set cookie is not accessible by child pages causing the cookie-banner to show again uselessly
        // even if it was closed at a parent page.
        var path = "path=/";
        document.cookie = cname + "=" + cvalue + "; " + expires + "; " + path;
    };

    // gets the cookie value given the cookie name
    proto.getCookie = function (cname) {
        var name = cname + "=";
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') c = c.substring(1);
            if (c.indexOf(name) == 0) return c.substring(name.length, c.length);
        }
        return "false";
    };

    // captures marketing information
    proto.captureMarketingInfo = function () {
        var queryString = window.location.search;
        if (queryString) {
            proto.upsertInfoToLocalStore(window.location.href);
        }
    }

    // addds marketing information to localStorage
    proto.upsertInfoToLocalStore = function (info) {
        if (typeof (Storage) !== 'undefined') {
            // Add an entry to localstore, else if an entry is present,
            // then append the new data to the existing key.
            try {
                var storeInfo = localStorage.getItem(proto.localStoreMarketingKey);
                localStorage.setItem(proto.localStoreMarketingKey, storeInfo ? storeInfo + ';' + info : info);
            } catch (e) {
                // Fall back to memory storage.
                // Known case where this might be needed is safari private mode, where writing to localstore is not allowed.
                if (window.marketingInfo) {
                    window.marketingInfo += ';' + info;
                }
                else {
                    window.marketingInfo = info;
                }
            }
        }
    }
}(oxa));

var cookieNotice = new oxa.cookieBanner();

$(document).ready(function () {
    $.ajax({
        url: "/account/get_cookies",
        cache: true,
        timeout: 30000,
        success: function (data) {
            cookieNotice.init(data);
            $("#cookie-markup").html(cookieNotice.Markup);

            // by default hide the banner ux
            document.getElementById("cookie-markup").style.display = "none";


            // add css links
            var cssLink = document.createElement("link");
            cssLink.href = cookieNotice.Css;
            cssLink.rel = "stylesheet";
            cssLink.type = "text/css";
            $("head").append(cssLink);

            // add js
            cookieNotice.LoadJSCookieAPI(cookieNotice.Js).done(function () {
                if (mscc) {
                    consentData = mscc.getConsentData();
                    // check if consent is given & valid or we need to consent
                    if(consentData != null && consentData.hasConsent && consentData.consentDate != null && consentData.consentDate.getTime() >= cookieNotice.MinimumConsentDate){
                        cookieNotice.addBICookies();
                        return;
                    }
                    document.getElementById("cookie-markup").style.display = "block";
                    document.getElementById("msccBanner").style.display = "block";
                    mscc.on('consent', cookieNotice.addBICookies);
                    mscc.on('consent', cookieNotice.setConsentTime);
                    // capture marketing information
                    cookieNotice.captureMarketingInfo();
                }
            });
        },
        error: function (xhr, status, error) {
            console.log(error);
        }
    });
});

