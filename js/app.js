(() => {
    "use strict";

    // =========================================================
    // APPLICATION STATE
    // =========================================================

    let db = null;
    let currentPatient = null;

    const PATIENT_STORAGE_KEY = "patient_id";
    const DEFAULT_STORAGE_BUCKET = "medical-images";


    // =========================================================
    // BASIC HELPERS
    // =========================================================

    function getPatientId() {
        return localStorage.getItem(PATIENT_STORAGE_KEY);
    }


    function setPatientId(patientId) {
        if (patientId) {
            localStorage.setItem(
                PATIENT_STORAGE_KEY,
                patientId
            );
        }
    }


    function clearPatientSession() {
        localStorage.removeItem(
            PATIENT_STORAGE_KEY
        );

        currentPatient = null;
    }


    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }


    function formatError(
        error,
        fallback = "Something went wrong."
    ) {
        return error?.message || fallback;
    }


    function showError(elementId, message) {

        const element =
            document.getElementById(elementId);

        if (!element) {
            console.error(
                `Element #${elementId} was not found.`
            );
            return;
        }

        element.textContent = message;
        element.style.display = "block";
    }


    function hideError(elementId) {

        const element =
            document.getElementById(elementId);

        if (!element) {
            return;
        }

        element.textContent = "";
        element.style.display = "none";
    }


    function setLoading(
        elementId,
        message = "Loading..."
    ) {

        const element =
            document.getElementById(elementId);

        if (!element) {
            return;
        }

        element.innerHTML = `
            <p class="text-muted">
                ${escapeHtml(message)}
            </p>
        `;
    }


    function requirePatient() {

        const patientId =
            getPatientId();

        if (!patientId) {

            alert(
                "Please login first."
            );

            window.showPage("home");

            return null;
        }

        return patientId;
    }


    // =========================================================
    // PAGE NAVIGATION
    // =========================================================

    window.showPage = function showPage(pageId) {

        const target =
            document.getElementById(pageId);

        if (!target) {

            console.error(
                `Page "${pageId}" does not exist in index.html`
            );

            return;
        }


        // Hide all pages
        document
            .querySelectorAll(".page")
            .forEach((page) => {

                page.classList.remove(
                    "active-page"
                );
            });


        // Show requested page
        target.classList.add(
            "active-page"
        );


        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });


        // Load profile data
        if (pageId === "profile") {

            if (
                typeof window.loadPatientProfile ===
                "function"
            ) {

                window.loadPatientProfile();
            }
        }


        // Load medical images
        if (pageId === "medicalImages") {

            if (
                typeof window.loadMedicalImages ===
                "function"
            ) {

                window.loadMedicalImages();
            }
        }


        // Load AI results
        if (pageId === "aiResults") {

            if (
                typeof window.loadAIResults ===
                "function"
            ) {

                window.loadAIResults();
            }
        }
    };


    // =========================================================
    // LOAD PATIENT PROFILE
    // =========================================================

    window.loadPatientProfile =
        async function loadPatientProfile() {

            if (!db) {

                console.error(
                    "Database is not initialized."
                );

                return;
            }


            const patientId =
                getPatientId();


            if (!patientId) {

                console.log(
                    "No patient ID found."
                );

                return;
            }


            console.log(
                "Loading patient profile:",
                patientId
            );


            try {

                const {
                    data,
                    error
                } = await db
                    .from("Patients")
                    .select("*")
                    .eq(
                        "patient_id",
                        patientId
                    )
                    .maybeSingle();


                if (error) {

                    console.error(
                        "Profile database error:",
                        error
                    );

                    alert(
                        "Unable to load patient profile: " +
                        formatError(error)
                    );

                    return;
                }


                if (!data) {

                    console.error(
                        "Patient record not found."
                    );

                    alert(
                        "Patient record not found."
                    );

                    clearPatientSession();

                    window.showPage(
                        "home"
                    );

                    return;
                }


                currentPatient =
                    data;


                // Patient name
                const displayName =
                    document.getElementById(
                        "displayName"
                    );

                if (displayName) {
                    displayName.textContent =
                        data.name || "-";
                }


                // Profile name
                const displayProfileName =
                    document.getElementById(
                        "displayProfileName"
                    );

                if (displayProfileName) {
                    displayProfileName.textContent =
                        data.name || "-";
                }


                // Patient ID
                const displayPatientId =
                    document.getElementById(
                        "displayPatientId"
                    );

                if (displayPatientId) {
                    displayPatientId.textContent =
                        data.patient_id || "-";
                }


                // Age
                const displayAge =
                    document.getElementById(
                        "displayAge"
                    );

                if (displayAge) {
                    displayAge.textContent =
                        data.age ?? "-";
                }


                // Gender
                const displayGender =
                    document.getElementById(
                        "displayGender"
                    );

                if (displayGender) {
                    displayGender.textContent =
                        data.gender || "-";
                }


                // Weight
                const displayWeight =
                    document.getElementById(
                        "displayWeight"
                    );

                if (displayWeight) {

                    displayWeight.textContent =
                        data.weight != null
                            ? `${data.weight} kg`
                            : "-";
                }


                // Height
                const displayHeight =
                    document.getElementById(
                        "displayHeight"
                    );

                if (displayHeight) {

                    displayHeight.textContent =
                        data.height != null
                            ? `${data.height} cm`
                            : "-";
                }


                console.log(
                    "Patient profile loaded successfully."
                );

            } catch (error) {

                console.error(
                    "Profile exception:",
                    error
                );

                alert(
                    formatError(
                        error,
                        "Unable to load patient profile."
                    )
                );
            }
        };


    // =========================================================
    // LOAD MEDICAL IMAGES
    // =========================================================

    window.loadMedicalImages =
        async function loadMedicalImages() {

            if (!db) {

                console.error(
                    "Database is not initialized."
                );

                return;
            }


            const patientId =
                requirePatient();


            if (!patientId) {
                return;
            }


            const imageList =
                document.getElementById(
                    "imageList"
                );


            if (!imageList) {

                console.error(
                    "#imageList was not found."
                );

                return;
            }


            setLoading(
                "imageList",
                "Loading medical images..."
            );


            try {

                const {
                    data,
                    error
                } = await db
                    .from("medical_images")
                    .select("*")
                    .eq(
                        "patient_id",
                        patientId
                    )
                    .order(
                        "created_at",
                        {
                            ascending: false
                        }
                    );


                if (error) {

                    console.error(
                        "Medical images database error:",
                        error
                    );


                    imageList.innerHTML = `
                        <div class="alert alert-danger">
                            ${escapeHtml(
                                formatError(error)
                            )}
                        </div>
                    `;

                    return;
                }


                if (
                    !data ||
                    data.length === 0
                ) {

                    imageList.innerHTML = `
                        <p class="text-muted">
                            No medical image records found.
                        </p>
                    `;

                    return;
                }


                imageList.innerHTML =
                    data
                        .map((image) => {

                            const publicUrl =
                                image.public_url ||
                                "";


                            let preview = "";


                            if (
                                publicUrl &&
                                image.image_type !== "MRI"
                            ) {

                                preview = `
                                    <div class="mt-3">
                                        <img
                                            src="${escapeHtml(publicUrl)}"
                                            alt="Medical image"
                                            class="image-preview img-fluid"
                                        >
                                    </div>
                                `;
                            }


                            return `
                                <div class="border rounded p-3 mb-3">

                                    <strong>
                                        ${escapeHtml(
                                            image.file_name ||
                                            "Medical Image"
                                        )}
                                    </strong>

                                    <br>

                                    <small>
                                        Type:
                                        ${escapeHtml(
                                            image.image_type ||
                                            "-"
                                        )}
                                    </small>

                                    ${preview}

                                </div>
                            `;

                        })
                        .join("");


            } catch (error) {

                console.error(
                    "Medical images exception:",
                    error
                );


                imageList.innerHTML = `
                    <div class="alert alert-danger">
                        ${escapeHtml(
                            formatError(
                                error,
                                "Unable to load medical images."
                            )
                        )}
                    </div>
                `;
            }
        };


    // =========================================================
    // LOAD AI RESULTS
    // =========================================================

    window.loadAIResults =
        async function loadAIResults() {

            if (!db) {

                console.error(
                    "Database is not initialized."
                );

                return;
            }


            const patientId =
                requirePatient();


            if (!patientId) {
                return;
            }


            window.showPage(
                "aiResults"
            );


            const resultsList =
                document.getElementById(
                    "resultsList"
                );


            if (!resultsList) {

                console.error(
                    "#resultsList was not found."
                );

                return;
            }


            setLoading(
                "resultsList",
                "Loading AI analysis results..."
            );


            try {

                const {
                    data,
                    error
                } = await db
                    .from("ai_results")
                    .select("*")
                    .eq(
                        "patient_id",
                        patientId
                    )
                    .order(
                        "created_at",
                        {
                            ascending: false
                        }
                    );


                if (error) {

                    console.error(
                        "AI results database error:",
                        error
                    );


                    resultsList.innerHTML = `
                        <div class="alert alert-danger">
                            ${escapeHtml(
                                formatError(error)
                            )}
                        </div>
                    `;

                    return;
                }


                if (
                    !data ||
                    data.length === 0
                ) {

                    resultsList.innerHTML = `
                        <p class="text-muted">
                            No AI results available.
                        </p>
                    `;

                    return;
                }


                resultsList.innerHTML =
                    data
                        .map(
                            (result) => `

                            <div class="border rounded p-3 mb-3">

                                <h5 class="fw-bold">
                                    AI Analysis Result
                                </h5>

                                <p>
                                    <strong>
                                        OA Result:
                                    </strong>

                                    ${escapeHtml(
                                        result.oa_result ||
                                        "-"
                                    )}
                                </p>

                                <p>
                                    <strong>
                                        Meniscus Thickness:
                                    </strong>

                                    ${escapeHtml(
                                        result.meniscus_thickness ||
                                        "-"
                                    )}
                                </p>

                                <p>
                                    <strong>
                                        Implant Recommendation:
                                    </strong>

                                    ${escapeHtml(
                                        result.implant_recommendation ||
                                        "-"
                                    )}
                                </p>

                            </div>
                        `
                        )
                        .join("");


            } catch (error) {

                console.error(
                    "AI results exception:",
                    error
                );


                resultsList.innerHTML = `
                    <div class="alert alert-danger">
                        ${escapeHtml(
                            formatError(
                                error,
                                "Unable to load AI results."
                            )
                        )}
                    </div>
                `;
            }
        };


    // =========================================================
    // REGISTER PATIENT
    // =========================================================

    function setupRegistration() {

        const form =
            document.getElementById(
                "registerForm"
            );


        if (!form) {

            console.warn(
                "#registerForm not found."
            );

            return;
        }


        form.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();


                hideError(
                    "registerError"
                );


                const patientId =
                    document
                        .getElementById(
                            "patientId"
                        )
                        ?.value
                        .trim();


                const name =
                    document
                        .getElementById(
                            "name"
                        )
                        ?.value
                        .trim();


                const age =
                    Number(
                        document
                            .getElementById(
                                "age"
                            )
                            ?.value
                    );


                const gender =
                    document
                        .getElementById(
                            "gender"
                        )
                        ?.value;


                const weight =
                    Number(
                        document
                            .getElementById(
                                "weight"
                            )
                            ?.value
                    );


                const height =
                    Number(
                        document
                            .getElementById(
                                "height"
                            )
                            ?.value
                    );


                if (!patientId || !name) {

                    showError(
                        "registerError",
                        "Patient ID and name are required."
                    );

                    return;
                }


                const patientData = {
                    patient_id: patientId,
                    name: name,
                    age: age,
                    gender: gender,
                    weight: weight,
                    height: height
                };


                try {

                    console.log(
                        "Registering patient:",
                        patientData
                    );


                    const {
                        data,
                        error
                    } = await db
                        .from("Patients")
                        .insert(
                            patientData
                        )
                        .select()
                        .single();


                    if (error) {

                        console.error(
                            "Patient registration error:",
                            error
                        );


                        showError(
                            "registerError",
                            "Registration failed: " +
                            formatError(error)
                        );

                        return;
                    }


                    currentPatient =
                        data;


                    setPatientId(
                        data.patient_id
                    );


                    form.reset();


                    alert(
                        "Patient registered successfully!"
                    );


                    window.showPage(
                        "profile"
                    );


                } catch (error) {

                    console.error(
                        "Registration exception:",
                        error
                    );


                    showError(
                        "registerError",
                        formatError(
                            error,
                            "Registration failed."
                        )
                    );
                }
            }
        );
    }


    // =========================================================
    // OLD PATIENT LOGIN
    // =========================================================

    function setupLogin() {

        const form =
            document.getElementById(
                "loginForm"
            );


        if (!form) {

            console.warn(
                "#loginForm not found."
            );

            return;
        }


        form.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();


                hideError(
                    "loginError"
                );


                const patientId =
                    document
                        .getElementById(
                            "loginPatientId"
                        )
                        ?.value
                        .trim();


                if (!patientId) {

                    showError(
                        "loginError",
                        "Please enter a Patient ID."
                    );

                    return;
                }


                try {

                    console.log(
                        "Looking up patient:",
                        patientId
                    );


                    const {
                        data,
                        error
                    } = await db
                        .from("Patients")
                        .select("*")
                        .eq(
                            "patient_id",
                            patientId
                        )
                        .maybeSingle();


                    if (error) {

                        console.error(
                            "Login database error:",
                            error
                        );


                        showError(
                            "loginError",
                            "Unable to find patient: " +
                            formatError(error)
                        );

                        return;
                    }


                    if (!data) {

                        showError(
                            "loginError",
                            "Patient ID not found."
                        );

                        return;
                    }


                    currentPatient =
                        data;


                    setPatientId(
                        data.patient_id
                    );


                    form.reset();


                    alert(
                        "Patient record found!"
                    );


                    window.showPage(
                        "profile"
                    );


                } catch (error) {

                    console.error(
                        "Login exception:",
                        error
                    );


                    showError(
                        "loginError",
                        formatError(
                            error,
                            "Login failed."
                        )
                    );
                }
            }
        );
    }


    // =========================================================
    // MEDICAL IMAGE UPLOAD
    // =========================================================

    function setupImageUpload(
        storageBucket
    ) {

        const form =
            document.getElementById(
                "imageForm"
            );


        if (!form) {

            console.warn(
                "#imageForm not found."
            );

            return;
        }


        form.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();


                const patientId =
                    requirePatient();


                if (!patientId) {
                    return;
                }


                const fileInput =
                    document.getElementById(
                        "medicalFile"
                    );


                const typeInput =
                    document.getElementById(
                        "imageType"
                    );


                const file =
                    fileInput?.files?.[0];


                const imageType =
                    typeInput?.value;


                if (!file) {

                    alert(
                        "Please select an image."
                    );

                    return;
                }


                if (!imageType) {

                    alert(
                        "Please select an image type."
                    );

                    return;
                }


                // 50 MB maximum
                if (
                    file.size >
                    50 * 1024 * 1024
                ) {

                    alert(
                        "File is too large. Maximum allowed size is 50 MB."
                    );

                    return;
                }


                const safeName =
                    file.name.replace(
                        /[^a-zA-Z0-9._-]/g,
                        "_"
                    );


                const storagePath =
                    `${patientId}/${Date.now()}_${safeName}`;


                try {

                    console.log(
                        "Uploading:",
                        storagePath
                    );


                    // -----------------------------------------
                    // STORAGE UPLOAD
                    // -----------------------------------------

                    const {
                        error: uploadError
                    } = await db.storage
                        .from(storageBucket)
                        .upload(
                            storagePath,
                            file,
                            {
                                cacheControl:
                                    "3600",
                                upsert:
                                    false
                            }
                        );


                    if (uploadError) {

                        throw new Error(
                            "Storage upload failed: " +
                            uploadError.message
                        );
                    }


                    // -----------------------------------------
                    // PUBLIC URL
                    // -----------------------------------------

                    const {
                        data: publicData
                    } = db.storage
                        .from(storageBucket)
                        .getPublicUrl(
                            storagePath
                        );


                    const publicUrl =
                        publicData?.publicUrl ||
                        null;


                    // -----------------------------------------
                    // DATABASE RECORD
                    // -----------------------------------------

                    const {
                        error: recordError
                    } = await db
                        .from(
                            "medical_images"
                        )
                        .insert({

                            patient_id:
                                patientId,

                            file_name:
                                file.name,

                            file_path:
                                storagePath,

                            image_type:
                                imageType,

                            public_url:
                                publicUrl
                        });


                    if (recordError) {

                        // Delete uploaded file
                        // if database insert fails.

                        await db.storage
                            .from(
                                storageBucket
                            )
                            .remove([
                                storagePath
                            ]);


                        throw new Error(
                            "Database insert failed: " +
                            recordError.message
                        );
                    }


                    alert(
                        "Medical image uploaded successfully!"
                    );


                    form.reset();


                    await window.loadMedicalImages();


                } catch (error) {

                    console.error(
                        "Medical image upload error:",
                        error
                    );


                    alert(
                        formatError(
                            error,
                            "Could not upload medical image."
                        )
                    );
                }
            }
        );
    }


    // =========================================================
    // LOGOUT
    // =========================================================

    window.logout =
        function logout() {

            clearPatientSession();

            window.showPage(
                "home"
            );
        };


    // =========================================================
    // APPLICATION INITIALIZATION
    // =========================================================

    function initialize() {

        console.log(
            "Initializing AI Knee Analysis System..."
        );


        // -----------------------------------------------------
        // CONFIGURATION
        // -----------------------------------------------------

        if (!window.APP_CONFIG) {

            console.error(
                "APP_CONFIG is missing."
            );

            alert(
                "Configuration error: js/config.js was not loaded."
            );

            return;
        }


        const SUPABASE_URL =
            window.APP_CONFIG.SUPABASE_URL;


        const SUPABASE_PUBLISHABLE_KEY =
            window.APP_CONFIG.SUPABASE_PUBLISHABLE_KEY;


        const STORAGE_BUCKET =
            window.APP_CONFIG.STORAGE_BUCKET ||
            DEFAULT_STORAGE_BUCKET;


        if (
            !SUPABASE_URL ||
            !SUPABASE_PUBLISHABLE_KEY
        ) {

            console.error(
                "Supabase configuration is incomplete."
            );

            alert(
                "Supabase configuration is incomplete. Check js/config.js."
            );

            return;
        }


        // -----------------------------------------------------
        // SUPABASE LIBRARY
        // -----------------------------------------------------

        if (
            !window.supabase ||
            typeof window.supabase.createClient !==
            "function"
        ) {

            console.error(
                "Supabase JavaScript library is missing."
            );

            alert(
                "Supabase library was not loaded."
            );

            return;
        }


        // -----------------------------------------------------
        // CREATE CLIENT
        // -----------------------------------------------------

        db =
            window.supabase.createClient(
                SUPABASE_URL,
                SUPABASE_PUBLISHABLE_KEY
            );


        console.log(
            "Supabase connected."
        );


        // -----------------------------------------------------
        // SETUP FORMS
        // -----------------------------------------------------

        setupRegistration();

        setupLogin();

        setupImageUpload(
            STORAGE_BUCKET
        );


        // -----------------------------------------------------
        // INITIAL PAGE
        // -----------------------------------------------------

        window.showPage(
            "home"
        );


        // -----------------------------------------------------
        // SAVED PATIENT
        // -----------------------------------------------------

        const savedPatientId =
            getPatientId();


        if (savedPatientId) {

            console.log(
                "Saved patient session:",
                savedPatientId
            );
        }


        console.log(
            "AI Knee Analysis System initialized successfully."
        );
    }


    // =========================================================
    // START AFTER HTML IS READY
    // =========================================================

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initialize
        );

    } else {

        initialize();
    }

})();