var ukrainian = 'uk';
var [preferedLanguage, locale] = (((navigator.userLanguage || navigator.language).replace('-', '_')).toLowerCase()).split('_');
var hostname = window.location.hostname;
var referrer = document.referrer;
var rootPage = (window.location.pathname == '/') || (window.location.pathname == '');

var landingPage = !referrer || referrer.indexOf(hostname) == -1;

if (preferedLanguage === ukrainian && landingPage && rootPage) {
    window.location = '/' + ukrainian + '/';
}