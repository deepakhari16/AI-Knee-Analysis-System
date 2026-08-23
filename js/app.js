(() => {
    "use strict";

    // =========================================================
    // GLOBAL PAGE NAVIGATION
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

        // Load page-specific data
        if (pageId === "profile") {
            loadPatientProfile();
        }

        if (pageId === "medicalImages") {
            loadMedicalImages();
        }

        if (pageId === "aiResults") {
            loadAIResults();
        }
    };


    // =========================================================
    // WAIT FOR HTML
    // =========================================================

    document.addEventListener("DOMContentLoaded", init);


    // =========================================================
    // APPLICATION INITIALIZATION
    // =========================================================

    function init() {

        console.log("AI Knee Analysis System starting...");

        // -----------------------------------------------------
        // CHECK CONFIGURATION
        // -----------------------------------------------------

        if (!window.APP_CONFIG) {
            console.error(
                "APP_CONFIG is missing. Make sure config.js is loaded before app.js."
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
                "Supabase configuration is missing."
            );

            return;
        }


        // -----------------------------------------------------
        // CHECK SUPABASE LIBRARY
        // -----------------------------------------------------

        if (!window.supabase) {
            console.error(
                "Supabase library is not loaded."
            );

            return;
        }


        // -----------------------------------------------------
        // CREATE SUPABASE CLIENT
        // -----------------------------------------------------

        const db = window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_PUBLISHABLE_KEY
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
            localStorage.removeItem(PATIENT_STORAGE_KEY);
            currentPatient = null;
        }


        function showError(elementId, message) {

            const element = document.getElementById(elementId);

            if (!element) {
                console.error(
                    `Error element not found: ${elementId}`
                );
                return;
            }

            element.textContent = message;
            element.style.display = "block";
        }


        function hideError(elementId) {

            const element = document.getElementById(elementId);

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

            const element = document.getElementById(elementId);

            if (element) {
                element.innerHTML = `
                    <p class="text-muted loading">
                        ${escapeHtml(message)}
                    </p>
                `;
            }
        }


        function requirePatient() {

            const patientId = getPatientId();

            if (!patientId) {

                alert("Please login first.");

                window.showPage("home");

                return null;
            }

            return patientId;
        }


        // =====================================================
        // REGISTER PATIENT
        // =====================================================

        const registerForm =
            document.getElementById("registerForm");


        if (registerForm) {

            registerForm.addEventListener(
                "submit",
                async function (event) {

                    event.preventDefault();

                    hideError("registerError");

                    const patientIdElement =
                        document.getElementById("patientId");

                    const nameElement =
                        document.getElementById("name");

                    const ageElement =
                        document.getElementById("age");

                    const genderElement =
                        document.getElementById("gender");

                    const weightElement =
                        document.getElementById("weight");

                    const heightElement =
                        document.getElementById("height");


                    const patientData = {

                        patient_id:
                            patientIdElement?.value.trim(),

                        name:
                            nameElement?.value.trim(),

                        age:
                            Number(ageElement?.value),

                        gender:
                            genderElement?.value,

                        weight:
                            Number(weightElement?.value),

                        height:
                            Number(heightElement?.value)
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

                        const {
                            data,
                            error
                        } = await db
                            .from("Patients")
                            .insert(patientData)
                            .select()
                            .single();


                        if (error) {

                            console.error(
                                "Patient registration error:",
                                error
                            );

                            showError(
                                "registerError",
                                `Registration failed: ${formatError(error)}`
                            );

                            return;
                        }


                        currentPatient = data;

                        setPatientId(
                            data.patient_id
                        );


                        alert(
                            "Patient registered successfully!"
                        );


                        registerForm.reset();


                        window.showPage("profile");

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
            document.getElementById("loginForm");


        if (loginForm) {

            loginForm.addEventListener(
                "submit",
                async function (event) {

                    event.preventDefault();

                    hideError("loginError");


                    const input =
                        document.getElementById(
                            "loginPatientId"
                        );


                    const patientId =
                        input?.value.trim();


                    if (!patientId) {

                        showError(
                            "loginError",
                            "Please enter a Patient ID."
                        );

                        return;
                    }


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
                                "Patient lookup error:",
                                error
                            );

                            showError(
                                "loginError",
                                `Unable to find patient: ${formatError(error)}`
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


                        currentPatient = data;

                        setPatientId(
                            data.patient_id
                        );


                        alert(
                            "Patient record found!"
                        );


                        loginForm.reset();


                        window.showPage("profile");

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
        // PATIENT PROFILE
        // =====================================================

        async function loadPatientProfile() {

            const patientId =
                getPatientId();


            if (!patientId) {

                window.showPage("home");

                return;
            }


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


                if (error || !data) {

                    console.error(
                        "Profile loading error:",
                        error
                    );


                    alert(
                        error
                            ? `Unable to load patient information: ${formatError(error)}`
                            : "Patient record not found."
                    );


                    clearPatientSession();

                    window.showPage("home");

                    return;
                }


                currentPatient = data;


                const fields = {

                    displayName:
                        data.name || "-",

                    displayProfileName:
                        data.name || "-",

                    displayPatientId:
                        data.patient_id || "-",

                    displayAge:
                        data.age ?? "-",

                    displayGender:
                        data.gender || "-",

                    displayWeight:
                        data.weight != null
                            ? `${data.weight} kg`
                            : "-",

                    displayHeight:
                        data.height != null
                            ? `${data.height} cm`
                            : "-"
                };


                Object.entries(fields).forEach(
                    ([id, value]) => {

                        const element =
                            document.getElementById(id);

                        if (element) {
                            element.textContent =
                                value;
                        }
                    }
                );

            } catch (error) {

                console.error(
                    "Profile exception:",
                    error
                );
            }
        }


        // =====================================================
        // MEDICAL IMAGES
        // =====================================================

        async function loadMedicalImages() {

            const patientId =
                requirePatient();

            const imageList =
                document.getElementById(
                    "imageList"
                );


            if (!imageList || !patientId) {
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


                if (!data || data.length === 0) {

                    imageList.innerHTML = `
                        <p class="text-muted">
                            No medical image records found.
                        </p>
                    `;

                    return;
                }


                imageList.innerHTML =
                    data.map((image) => {

                        const publicUrl =
                            image.public_url || "";


                        const imageTag =
                            publicUrl &&
                            image.image_type !== "MRI"
                                ? `
                                    <div class="mt-3">
                                        <img
                                            src="${escapeHtml(publicUrl)}"
                                            alt="Medical image"
                                            class="image-preview"
                                        >
                                    </div>
                                `
                                : "";


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

                                ${imageTag}

                            </div>
                        `;

                    }).join("");


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
        }


        // =====================================================
        // MEDICAL IMAGE UPLOAD
        // =====================================================

        const imageForm =
            document.getElementById("imageForm");


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


                    const imageTypeElement =
                        document.getElementById(
                            "imageType"
                        );


                    const file =
                        fileInput?.files?.[0];


                    const imageType =
                        imageTypeElement?.value;


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


                    if (file.size > maxSize) {

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

                        // -----------------------------------------
                        // 1. Upload image to Supabase Storage
                        // -----------------------------------------

                        const {
                            error: uploadError
                        } = await db.storage
                            .from(STORAGE_BUCKET)
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
                                `Storage upload failed: ${uploadError.message}`
                            );
                        }


                        // -----------------------------------------
                        // 2. Get public URL
                        // -----------------------------------------

                        const {
                            data: publicData
                        } = db.storage
                            .from(STORAGE_BUCKET)
                            .getPublicUrl(
                                storagePath
                            );


                        // -----------------------------------------
                        // 3. Save database record
                        // -----------------------------------------

                        const {
                            error: recordError
                        } = await db
                            .from("medical_images")
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
                                    publicData?.publicUrl ||
                                    null
                            });


                        if (recordError) {

                            // Remove uploaded file
                            await db.storage
                                .from(STORAGE_BUCKET)
                                .remove([
                                    storagePath
                                ]);


                            throw new Error(
                                `Database insert failed: ${recordError.message}`
                            );
                        }


                        alert(
                            "Medical image uploaded successfully!"
                        );


                        imageForm.reset();


                        await loadMedicalImages();


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
            async function () {

                window.showPage(
                    "aiResults"
                );


                const patientId =
                    requirePatient();


                const resultsList =
                    document.getElementById(
                        "resultsList"
                    );


                if (
                    !patientId ||
                    !resultsList
                ) {
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
                            "AI results loading error:",
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
            function () {

                clearPatientSession();

                window.showPage(
                    "home"
                );
            };


        // =====================================================
        // START APPLICATION
        // =====================================================

        console.log(
            "AI Knee Analysis System initialized successfully."
        );


        // Show home page
        window.showPage("home");


        // Check saved patient
        const savedPatientId =
            getPatientId();


        if (savedPatientId) {

            console.info(
                "Saved patient session found:",
                savedPatientId
            );
        }
    }

})();
