(() => {
    "use strict";

    // =========================================================
    // GLOBAL FUNCTIONS
    // =========================================================

    window.showPage = function (pageId) {
        const target = document.getElementById(pageId);

        if (!target) {
            console.error("Page not found:", pageId);
            return;
        }

        document.querySelectorAll(".page").forEach((page) => {
            page.classList.remove("active-page");
        });

        target.classList.add("active-page");

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

        // Load data when required
        if (pageId === "profile" && typeof window.loadPatientProfile === "function") {
            window.loadPatientProfile();
        }

        if (
            pageId === "medicalImages" &&
            typeof window.loadMedicalImages === "function"
        ) {
            window.loadMedicalImages();
        }

        if (
            pageId === "aiResults" &&
            typeof window.loadAIResults === "function"
        ) {
            window.loadAIResults();
        }
    };


    // =========================================================
    // APPLICATION START
    // =========================================================

    document.addEventListener("DOMContentLoaded", initialize);


    async function initialize() {

        console.log("=================================");
        console.log("AI Knee Analysis System");
        console.log("Initializing application...");
        console.log("=================================");


        // =====================================================
        // CHECK CONFIG.JS
        // =====================================================

        if (!window.APP_CONFIG) {
            console.error(
                "ERROR: APP_CONFIG not found."
            );

            alert(
                "Application configuration is missing. Please check js/config.js."
            );

            return;
        }


        const {
            SUPABASE_URL,
            SUPABASE_PUBLISHABLE_KEY,
            STORAGE_BUCKET = "medical-images"
        } = window.APP_CONFIG;


        if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {

            console.error(
                "ERROR: Supabase URL or key is missing."
            );

            alert(
                "Supabase configuration is incomplete."
            );

            return;
        }


        // =====================================================
        // CHECK SUPABASE
        // =====================================================

        if (!window.supabase) {

            console.error(
                "ERROR: Supabase library was not loaded."
            );

            alert(
                "Supabase library is not loaded."
            );

            return;
        }


        // =====================================================
        // CREATE DATABASE CLIENT
        // =====================================================

        const db = window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_PUBLISHABLE_KEY
        );


        console.log(
            "Supabase client initialized."
        );


        // =====================================================
        // APPLICATION STATE
        // =====================================================

        let currentPatient = null;

        const PATIENT_STORAGE_KEY = "patient_id";


        // =====================================================
        // HELPER FUNCTIONS
        // =====================================================

        function getPatientId() {

            return localStorage.getItem(
                PATIENT_STORAGE_KEY
            );
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


        function showError(elementId, message) {

            const element =
                document.getElementById(elementId);

            if (!element) {
                console.warn(
                    `Element not found: ${elementId}`
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


        function setLoading(
            elementId,
            message = "Loading..."
        ) {

            const element =
                document.getElementById(elementId);

            if (element) {

                element.innerHTML = `
                    <p class="text-muted">
                        ${escapeHtml(message)}
                    </p>
                `;
            }
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


        // =====================================================
        // PATIENT PROFILE
        // =====================================================

        window.loadPatientProfile =
            async function loadPatientProfile() {

                const patientId =
                    getPatientId();


                if (!patientId) {

                    console.log(
                        "No patient session found."
                    );

                    return;
                }


                console.log(
                    "Loading patient:",
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
                            "Profile loading error:",
                            error
                        );

                        alert(
                            "Unable to load patient information: " +
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

                        window.showPage("home");

                        return;
                    }


                    currentPatient = data;


                    // -----------------------------------------
                    // UPDATE PROFILE
                    // -----------------------------------------

                    const displayName =
                        document.getElementById(
                            "displayName"
                        );

                    const displayProfileName =
                        document.getElementById(
                            "displayProfileName"
                        );

                    const displayPatientId =
                        document.getElementById(
                            "displayPatientId"
                        );

                    const displayAge =
                        document.getElementById(
                            "displayAge"
                        );

                    const displayGender =
                        document.getElementById(
                            "displayGender"
                        );

                    const displayWeight =
                        document.getElementById(
                            "displayWeight"
                        );

                    const displayHeight =
                        document.getElementById(
                            "displayHeight"
                        );


                    if (displayName) {
                        displayName.textContent =
                            data.name || "-";
                    }


                    if (displayProfileName) {
                        displayProfileName.textContent =
                            data.name || "-";
                    }


                    if (displayPatientId) {
                        displayPatientId.textContent =
                            data.patient_id || "-";
                    }


                    if (displayAge) {
                        displayAge.textContent =
                            data.age ?? "-";
                    }


                    if (displayGender) {
                        displayGender.textContent =
                            data.gender || "-";
                    }


                    if (displayWeight) {
                        displayWeight.textContent =
                            data.weight != null
                                ? `${data.weight} kg`
                                : "-";
                    }


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
                }
            };


        // =====================================================
        // MEDICAL IMAGE LIST
        // =====================================================

        window.loadMedicalImages =
            async function loadMedicalImages() {

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
                        "imageList element not found."
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
                            "Medical image loading error:",
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
                        data.map(
                            (image) => {

                                const publicUrl =
                                    image.public_url || "";


                                let imagePreview = "";


                                if (
                                    publicUrl &&
                                    image.image_type !== "MRI"
                                ) {

                                    imagePreview = `
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

                                        ${imagePreview}

                                    </div>
                                `;

                            }
                        ).join("");


                    console.log(
                        "Medical images loaded:",
                        data.length
                    );


                } catch (error) {

                    console.error(
                        "Medical image exception:",
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


        // =====================================================
        // PATIENT REGISTRATION
        // =====================================================

        const registerForm =
            document.getElementById(
                "registerForm"
            );


        if (registerForm) {

            registerForm.addEventListener(
                "submit",
                async function (event) {

                    event.preventDefault();

                    hideError(
                        "registerError"
                    );


                    const patientData = {

                        patient_id:
                            document
                                .getElementById(
                                    "patientId"
                                )
                                ?.value
                                .trim(),

                        name:
                            document
                                .getElementById(
                                    "name"
                                )
                                ?.value
                                .trim(),

                        age:
                            Number(
                                document
                                    .getElementById(
                                        "age"
                                    )
                                    ?.value
                            ),

                        gender:
                            document
                                .getElementById(
                                    "gender"
                                )
                                ?.value,

                        weight:
                            Number(
                                document
                                    .getElementById(
                                        "weight"
                                    )
                                    ?.value
                            ),

                        height:
                            Number(
                                document
                                    .getElementById(
                                        "height"
                                    )
                                    ?.value
                            )
                    };


                    if (
                        !patientData.patient_id ||
                        !patientData.name
                    ) {

                        showError(
                            "registerError",
                            "Patient ID and name are required."
                        );

                        return;
                    }


                    try {

                        console.log(
                            "Registering patient..."
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
                                "Registration database error:",
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


                        registerForm.reset();


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

        } else {

            console.warn(
                "registerForm not found."
            );
        }


        // =====================================================
        // OLD PATIENT LOGIN
        // =====================================================

        const loginForm =
            document.getElementById(
                "loginForm"
            );


        if (loginForm) {

            loginForm.addEventListener(
                "submit",
                async function (event) {

                    event.preventDefault();

                    hideError(
                        "loginError"
                    );


                    const loginInput =
                        document.getElementById(
                            "loginPatientId"
                        );


                    const patientId =
                        loginInput?.value.trim();


                    if (!patientId) {

                        showError(
                            "loginError",
                            "Please enter a Patient ID."
                        );

                        return;
                    }


                    try {

                        console.log(
                            "Searching patient:",
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


                        loginForm.reset();


                        console.log(
                            "Patient login successful."
                        );


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

        } else {

            console.warn(
                "loginForm not found."
            );
        }


        // =====================================================
        // MEDICAL IMAGE UPLOAD
        // =====================================================

        const imageForm =
            document.getElementById(
                "imageForm"
            );


        if (imageForm) {

            imageForm.addEventListener(
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


                    const imageTypeInput =
                        document.getElementById(
                            "imageType"
                        );


                    const file =
                        fileInput?.files?.[0];


                    const imageType =
                        imageTypeInput?.value;


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


                    const maxSize =
                        50 * 1024 * 1024;


                    if (
                        file.size >
                        maxSize
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
                            "Uploading image:",
                            storagePath
                        );


                        // -------------------------------------
                        // UPLOAD TO STORAGE
                        // -------------------------------------

                        const {
                            error:
                                uploadError
                        } =
                            await db.storage
                                .from(
                                    STORAGE_BUCKET
                                )
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


                        // -------------------------------------
                        // GET PUBLIC URL
                        // -------------------------------------

                        const {
                            data:
                                publicData
                        } =
                            db.storage
                                .from(
                                    STORAGE_BUCKET
                                )
                                .getPublicUrl(
                                    storagePath
                                );


                        const publicUrl =
                            publicData?.publicUrl ||
                            null;


                        // -------------------------------------
                        // SAVE DATABASE RECORD
                        // -------------------------------------

                        const {
                            error:
                                recordError
                        } =
                            await db
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

                            // Remove orphan file
                            await db.storage
                                .from(
                                    STORAGE_BUCKET
                                )
                                .remove([
                                    storagePath
                                ]);


                            throw new Error(
                                "Database insert failed: " +
                                recordError.message
                            );
                        }


                        console.log(
                            "Image saved successfully."
                        );


                        alert(
                            "Medical image uploaded successfully!"
                        );


                        imageForm.reset();


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

        } else {

            console.warn(
                "imageForm not found."
            );
        }


        // =====================================================
        // AI RESULTS
        // =====================================================

        window.loadAIResults =
            async function loadAIResults() {

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
                            "AI result database error:",
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
                        data.map(
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
                        ).join("");


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


        // =====================================================
        // LOGOUT
        // =====================================================

        window.logout =
            function logout() {

                clearPatientSession();

                window.showPage(
                    "home"
                );
            };


        // =====================================================
        // INITIAL PAGE
        // =====================================================

        window.showPage(
            "home"
        );


        // =====================================================
        // SAVED PATIENT SESSION
        // =====================================================

        const savedPatientId =
            getPatientId();


        if (savedPatientId) {

            console.log(
                "Saved patient session:",
                savedPatientId
            );
        }


        console.log(
            "Application initialized successfully."
        );
    }

})();
