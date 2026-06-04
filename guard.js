/**
 * Solace Haven - Auth Guard
 * Include this script at the top of every protected page (<script src="guard.js"></script>)
 * Pages that are public (index, login, register): do NOT include this script.
 */
(function() {
    if (localStorage.getItem("solace-authenticated") !== "true") {
        // Redirect to login with a return-to hint
        window.location.replace("login.html");
    }
})();
