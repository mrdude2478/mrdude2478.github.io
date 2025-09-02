/*
/ means the root of the current drive;
./ means the current directory;
../ means the parent of the current directory.
*/

var payloadFile = sessionStorage.getItem('payload');
var payloadTitle = sessionStorage.getItem('title');
//var message = 'Exploiting console and injecting ';
let cacheInstalled = localStorage.getItem('cache') === 'true';
let cb3 = localStorage.getItem('checkboxState3') === 'true';

if (payloadFile === null || payloadFile === "") {
    payloadFile = './payloads/hen/goldhen.bin';
}

if (payloadTitle === null || payloadTitle === "") {
    payloadTitle = 'GoldHEN';
}

const tooltipText = payloadTitle;
document.getElementById("tooltip").textContent = tooltipText;

function checkCacheStatus() {
    const cachePageLink = document.getElementById('cachePageLink');

    if (cachePageLink && cacheInstalled) {
        // Remove the lapse-dependent class and add a new class to hide it
        cachePageLink.classList.remove('lapse-dependent');
        cachePageLink.classList.add('cache-installed');
        cachePageLink.style.display = 'none';
        showMessage("<span style='color: #babef7;'>★</span><span style='color: #bae1f7;'>★</span><span style='color: #aac5f2;'>★</span> PS4 Payload Injector <span style='color: #aac5f2;'>★</span><span style='color: #bae1f7;'>★</span><span style='color: #babef7;'>★</span><br><span style='color: red;'>♥</span> Cached version <span style='color: red;'>♥</span>");
    }
}

async function forceGC() {
    try {
        for (let i = 0; i < 50; i++) {
            let junk = new Array(10000).fill(0);
            junk = null;
            await new Promise(resolve => setTimeout(resolve, 10)); // Give browser time to GC
        }
    }
    catch (err) {
        await showMessage("Failed to free memory");
    }
}

async function isesp32() {
    try {
        const localRes = await fetch("/esp32-version");
        return localRes.ok;
    } catch (error) {
        return false;
    }
}

async function showMessage(msg) {
    const statusText = document.getElementById("statusText");
    if (statusText) {
        statusText.innerHTML = "<h1>" + msg + "</h1>";
    }
    document.getElementById("message").style.display = 'block';
}

async function cachepage() {
    if (window.applicationCache.status == '0') {
        window.location.replace("./cache.html");
    }
    else {
        await showMessage("Cache is already installed");
        // Set cache flag
        localStorage.setItem('cache', 'true');
        // Remove the cache page link from DOM
        const cachePageLink = document.getElementById('cachePageLink');
        if (cachePageLink) {
            cachePageLink.parentNode.removeChild(cachePageLink);
        }
    }
}

async function LapseHax() {
    await showMessage("Lapse, Attempting to inject: " + payloadTitle);
    //import('./LapseHack/alert.mjs');
    const alertScript = document.createElement('script');
    alertScript.src = '/LapseHack/alert.mjs';
    alertScript.type = 'module';
    document.head.appendChild(alertScript);
}

async function ExFatHax() {
    await showMessage("ExFatHax, Attempting to inject: " + payloadTitle);

    // Dynamically add loader.js (non-module script)
    const int64Script = document.createElement('script');
    int64Script.src = '/ExFatHack/int64.js';
    int64Script.defer = true;
    document.head.appendChild(int64Script);

    const ropScript = document.createElement('script');
    ropScript.src = '/ExFatHack/rop.js';
    ropScript.defer = true;
    document.head.appendChild(ropScript);

    const kexploitScript = document.createElement('script');
    kexploitScript.src = '/ExFatHack/loader.js';
    kexploitScript.defer = true;
    document.head.appendChild(kexploitScript);

    // Dynamically add exploitunpacked.js (module script)
    const alertScript = document.createElement('script');
    alertScript.src = '/ExFatHack/alert.mjs';
    alertScript.type = 'module';
    document.head.appendChild(alertScript);
}

function callalert() {
    isesp32().then(isESP => {
        if (isESP) {
            if (cb3 || cacheInstalled) {
                LapseHax();
            }
            else {
                ExFatHax();
            }
        }
        else {
            LapseHax();
        }
    });
}

function goldhen() {
    payloadTitle = sessionStorage.getItem('title');
    payloadFile = sessionStorage.getItem('payload');
    callalert();
}

function vtx() {
    payloadFile = './payloads/hen/hen.bin';
    payloadTitle = 'PS4HEN v2.2.0';
    callalert();
}

function historyblocker() {
    payloadFile = './payloads/blockers/historyblocker.bin';
    payloadTitle = 'History Blocker';
    callalert();
}

function disabledupdates() {
    payloadFile = './payloads/blockers/disableupdates.bin';
    payloadTitle = 'Disable Updates';
    callalert();
}

function enableupdates() {
    payloadFile = './payloads/blockers/enableupdates.bin';
    payloadTitle = 'Enable Updates';
    callalert();
}

function bloader() {
    payloadTitle = 'Binloader';
    callalert();
}

function dumpG() {
    payloadFile = './payloads/dumpers/dumperG.bin';
    payloadTitle = 'Game Dumper';
    callalert();
}

function dumpU() {
    payloadFile = './payloads/dumpers/dumperU.bin';
    payloadTitle = 'Game Update Dumper';
    callalert();
}

function dumpGU() {
    payloadFile = './payloads/dumpers/dumperGU.bin';
    payloadTitle = 'Game and Update Dumper';
    callalert();
}

function dumpM() {
    payloadFile = './payloads/dumpers/dumperM.bin';
    payloadTitle = 'Dump and Merge Game + Update';
    callalert();
}

function dbbackup() {
    payloadFile = './payloads/database/backup.bin';
    payloadTitle = 'Database backup';
    callalert();
}

function dbrestore() {
    payloadFile = './payloads/database/restore.bin';
    payloadTitle = 'Database restore';
    callalert();
}

function reset() {
    const checkbox = document.getElementById('myCheckbox');
    if (checkbox) {
        checkbox.checked = false;
        localStorage.setItem('checkboxState', 'false');
    }
}

//popup for errors and finishing the exploit
function createPopUpMessage(msg) {
    try {
        // Remove existing message if any
        const oldMessage = document.getElementById('lapseMessage');
        if (oldMessage) oldMessage.remove();

        // Create new message
        const messageDiv = document.createElement('div');
        messageDiv.id = 'lapseMessage';
        messageDiv.innerHTML = "<h1>" + msg + "</h1>";
        messageDiv.style.position = 'fixed';
        messageDiv.style.top = '50%';
        messageDiv.style.left = '50%';
        // if checkbox 3 is checked we are using lapse
        if (cb3 === true && !cacheInstalled) {
            messageDiv.style.transform = 'translate(-50%, calc(-50% + 18px))'; // This centers the element, then moves down 24 pixels
            messageDiv.style.minHeight = '386px';
        }
        else if (cacheInstalled) {
            messageDiv.style.transform = 'translate(-50%, calc(-50% + 14px))'; // This centers the element, then moves down 24 pixels
            messageDiv.style.minHeight = '386px';
        }
        else {
            messageDiv.style.transform = 'translate(-50%, calc(-50% + 20px))'; // This centers the element, then moves down 24 pixels
            messageDiv.style.minHeight = '432px';
        }
        messageDiv.style.width = '47.8%'; // Use width instead of maxWidth for consistency
        messageDiv.style.color = 'white';
        messageDiv.style.padding = '20px';
        messageDiv.style.background = 'rgba(0, 0, 0, 0.8)';
        messageDiv.style.borderRadius = '10px';
        messageDiv.style.display = 'flex';
        messageDiv.style.textAlign = 'center';
        messageDiv.style.alignItems = 'center';
        messageDiv.style.justifyContent = 'center';
        messageDiv.style.overflow = 'hidden';
        messageDiv.style.boxShadow = '0 0 15px 6px rgba(72, 171, 224, 0.2)';
        messageDiv.style.zIndex = '100';

        document.body.appendChild(messageDiv);
    } catch (e) {
        showMessage("Failed to create message:", e);
    }
}

//checkbox sections

document.addEventListener('DOMContentLoaded', () => {
    const navbar = document.querySelector('.navbar');
    const esp32Message = document.getElementById('esp32-message');
    const lapseToggle = document.getElementById('lapse-toggle');
    checkCacheStatus();

    isesp32().then(isESP => {
        if (isESP && !cacheInstalled) {
            navbar.classList.add('esp32-visible');
            document.body.classList.add('esp32-visible');
            document.body.classList.remove('esp32-hidden');


            // Show lapse toggle when on ESP32
            //*
            if (document.getElementById('lapse-toggle')) {
                document.getElementById('lapse-toggle').style.display = 'block';
            }
            //*/
        } else {
            navbar.classList.remove('esp32-visible');
            document.body.classList.remove('esp32-visible');
            document.body.classList.add('esp32-hidden');

            // Hide lapse toggle when not on ESP32
            //*
            if (document.getElementById('lapse-toggle')) {
                document.getElementById('lapse-toggle').style.display = 'none';
            }
            //*/
            navbar.classList.add('lapse-visible');
        }
    });

    const checkbox = document.getElementById('myCheckbox');
    const checkbox2 = document.getElementById('myCheckbox2');
    const checkbox3 = document.getElementById('myCheckbox3');

    // Load saved states (unchanged)
    const savedState = localStorage.getItem('checkboxState');
    const savedState2 = localStorage.getItem('checkboxState2');
    const savedState3 = localStorage.getItem('checkboxState3');

    if (savedState !== null && checkbox) checkbox.checked = savedState === 'true';
    if (savedState2 !== null && checkbox2) checkbox2.checked = savedState2 === 'true';
    if (savedState3 !== null && checkbox3) checkbox3.checked = savedState3 === 'true';

    // Ensure only one is checked on load (if both were true)
    if (checkbox && checkbox2 && checkbox.checked && checkbox2.checked) {
        checkbox2.checked = false;
        localStorage.setItem('checkboxState2', 'false');
    }

    // Generalized mutual exclusion (replaces individual listeners)
    const exclusiveCheckboxes = [checkbox, checkbox2]; // Add more here if needed
    exclusiveCheckboxes.forEach((box) => {
        box.addEventListener('change', function () {
            if (this.checked) {
                exclusiveCheckboxes.forEach((otherBox) => {
                    if (otherBox !== this) {
                        otherBox.checked = false;
                        localStorage.setItem(
                            otherBox.id === 'myCheckbox' ? 'checkboxState' : 'checkboxState2',
                            'false'
                        );
                    }
                });
            }
            localStorage.setItem(
                this.id === 'myCheckbox' ? 'checkboxState' : 'checkboxState2',
                this.checked
            );
            // Trigger payload functions
            if (this.id === 'myCheckbox') onCheckboxChange(this.checked);
            else if (this.id === 'myCheckbox2') onCheckboxChange2(this.checked);
        });
    });

    // Keep checkbox3's independent listener
    // In your html.js file, update the checkbox3 change event listener
    if (checkbox3) {
        checkbox3.addEventListener('change', function () {
            localStorage.setItem('checkboxState3', this.checked);
            cb3 = localStorage.getItem('checkboxState3') === 'true';
            onCheckboxChange3(this.checked);

            // Toggle visibility of lapse-dependent elements
            if (this.checked || (cacheInstalled)) {
                navbar.classList.add('lapse-visible');
                document.body.classList.add('lapse-hidden'); // Hide PS4HEN group
                //alert("Method 1 result: " + cb3 + " (type: " + typeof cb3 + ")");
            } else {
                navbar.classList.remove('lapse-visible');
                document.body.classList.remove('lapse-hidden'); // Show PS4HEN group
                //alert("Method 1 result: " + cb3 + " (type: " + typeof cb3 + ")");
            }

            //Don't allow auto injection when using lapse
            checkbox2.checked = false;
            localStorage.setItem('checkboxState2', 'false');
            checkbox1.checked = false;
            localStorage.setItem('checkboxState1', 'false');
        });

        // Initialize visibility on page load
        if (checkbox3.checked || cacheInstalled) {
            navbar.classList.add('lapse-visible');
            document.body.classList.add('lapse-hidden'); // Hide PS4HEN group on load if checked
        } else {
            navbar.classList.remove('lapse-visible');
            document.body.classList.remove('lapse-hidden'); // Show PS4HEN group on load if unchecked
        }
    }

    // Rest of your code (load event, functions, etc.) stays unchanged
    window.addEventListener('load', () => {
        if (checkbox?.checked) onCheckboxChange(true);
        if (checkbox2?.checked) onCheckboxChange2(true);
    });

    function onCheckboxChange(isChecked) { if (isChecked && (!cacheInstalled)) goldhen(); }
    function onCheckboxChange2(isChecked) { if (isChecked && (!cacheInstalled)) vtx(); }
    function onCheckboxChange3(isChecked) { }
    //below is just to test boolean values when the page loads.
    //alert("Method 1 result: " + cb3 + " (type: " + typeof cb3 + ")");

});
