addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    alert(`Unhandled rejection\n${reason}\n${reason.sourceURL}:${reason.line}:${reason.column}\n${reason.stack}`);
});

addEventListener("error", (event) => {
    const reason = event.error;
    alert(`Unhandled error\n${reason}\n${reason.sourceURL}:${reason.line}:${reason.column}\n${reason.stack}`);
    return true;
});

import("/LapseHack/psfree.mjs");