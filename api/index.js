// Vercel Serverless Function entry point
let app;
let initError = null;

try {
    app = require("../server.js");
} catch (err) {
    console.error("Failed to initialize server.js:", err);
    initError = err;
}

module.exports = (req, res) => {
    if (initError) {
        return res.status(500).json({
            error: "Backend Initialization Error",
            message: initError.message
        });
    }
    return app(req, res);
};
