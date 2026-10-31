/* ==========================================
   NEXORA KEY MODAL
========================================== */

let nxCurrentStep = 1;

let nxSeconds = 159;

let nxTimerInterval = null;

let nxReceipt = null;


/* OPEN */

function openKeyModal() {

    const modal =
        document.getElementById("nxKeyOverlay");

    if (!modal) return;

    modal.classList.add("nx-open");

    nxGoStep(1);
}


/* CLOSE */

function closeNexoraKey() {

    const modal =
        document.getElementById("nxKeyOverlay");

    if (!modal) return;

    modal.classList.remove("nx-open");

    if (nxTimerInterval) {

        clearInterval(nxTimerInterval);

        nxTimerInterval = null;
    }
}


/* CHANGE STEP */



/* TIMER */

function nxStartTimer() {

    if (nxTimerInterval) {

        clearInterval(nxTimerInterval);

    }


    nxSeconds = 159;

    nxUpdateTimer();


    nxTimerInterval =
        setInterval(function() {

            nxSeconds--;

            nxUpdateTimer();


            if (nxSeconds <= 0) {

                clearInterval(
                    nxTimerInterval
                );

                nxTimerInterval = null;

                const submit =
                    document.getElementById(
                        "nxSubmit"
                    );

                if (submit) {

                    submit.disabled = true;

                    submit.textContent =
                        "Payment Expired";

                }

            }

        }, 1000);

}


function nxUpdateTimer() {

    const timer =
        document.getElementById(
            "nxTimer"
        );

    if (!timer) return;


    const minutes =
        Math.floor(nxSeconds / 60);

    const seconds =
        nxSeconds % 60;


    timer.textContent =
        String(minutes).padStart(2, "0")
        + ":"
        + String(seconds).padStart(2, "0");
}


/* COPY */

function nxCopy(value) {

    navigator.clipboard
        .writeText(value)
        .then(function() {

            alert("Copied!");

        })
        .catch(function() {

            alert(value);

        });

}


/* RECEIPT */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        const input =
            document.getElementById(
                "nxReceipt"
            );


        if (!input) return;


        input.addEventListener(
            "change",
            function() {

                if (!this.files.length) {

                    return;

                }


                nxReceipt =
                    this.files[0];


                const text =
                    document.getElementById(
                        "nxReceiptText"
                    );


                if (text) {

                    text.textContent =
                        nxReceipt.name;

                }


                const submit =
                    document.getElementById(
                        "nxSubmit"
                    );


                if (submit) {

                    submit.classList.add(
                        "nx-ready"
                    );

                }

            }
        );

    }
);


/* SUBMIT */

function nxSubmitPayment() {

    if (!nxReceipt) {

        alert(
            "Please upload your payment receipt first."
        );

        return;

    }


    if (nxSeconds <= 0) {

        alert(
            "Payment session has expired."
        );

        return;

    }


    alert(
        "Demo payment submitted successfully."
    );

    closeNexoraKey();

}


/* CLICK OUTSIDE */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        const overlay =
            document.getElementById(
                "nxKeyOverlay"
            );


        if (!overlay) return;


        overlay.addEventListener(
            "click",
            function(event) {

                if (
                    event.target === overlay
                ) {

                    closeNexoraKey();

                }

            }
        );

    }
);


/* ESC */

document.addEventListener(
    "keydown",
    function(event) {

        if (event.key === "Escape") {

            closeNexoraKey();

        }

    }
);