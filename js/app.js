(() => {
    "use strict";

    // ---------------------------------------------------------
    // CONFIGURATION
    // ---------------------------------------------------------

    if (!window.APP_CONFIG) {
        throw new Error("Missing js/config.js");
    }

    const {
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY,
        STORAGE_BUCKET = "medical-images"
    } = window.APP_CONFIG;

    if (
        !SUPABASE_URL ||
        SUPABASE_URL.includes("YOUR_") ||
        !SUPABASE_PUBLISHABLE_KEY ||
        SUPABASE_PUBLISHABLE_KEY.includes("YOUR_")
    ) {
        console.error(
            "Supabase configuration is missing. Create js/config.js from js/config.example.js."
        );
    }

    const db = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );

    // ---------------------------------------------------------
    // APPLICATION STATE
    // ---------------------------------------------------------

    let currentPatient = null;

    const PATIENT_STORAGE_KEY = "patient_id";

    // ---------------------------------------------------------
    // HELPERS
    // ---------------------------------------------------------

    function getPatientId() {
        return localStorage.getItem(PATIENT_STORAGE_KEY);
    }

    function setPatientId(patientId) {
        localStorage.setItem(PATIENT_STORAGE_KEY, patientId);
    }

    function clearPatientSession() {
        localStorage.removeItem(PATIENT_STORAGE_KEY);
        currentPatient = null;
    }

    function showError(elementId, message) {
        const element = document.getElementById(elementId);

        if (!element) return;

        element.textContent = message;
        element.style.display = "block";
    }

    function hideError(elementId) {
        const element = document.getElementById(elementId);

        if (!element) return;

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

    function formatError(error, fallback = "Something went wrong.") {
        return error?.message || fallback;
    }

    function setLoading(elementId, message = "Loading...") {
        const element = document.getElementById(elementId);

        if (element) {
            element.innerHTML = `<p class="text-muted loading">${escapeHtml(message)}</p>`;
        }
    }

    function requirePatient() {
        const patientId = getPatientId();

        if (!patientId) {
            alert("Please login first.");
            showPage("home");
            return null;
        }

        return patientId;
    }

    // ---------------------------------------------------------
    // PAGE NAVIGATION
    // ---------------------------------------------------------

    window.showPage = function showPage(pageId) {
        const target = document.getElementById(pageId);

        if (!target) {
            console.error(`Page not found: ${pageId}`);
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

        if (pageId === "profile") {
            loadPatientProfile();
        }

        if (pageId === "medicalImages") {
            loadMedicalImages();
        }
    };

    // ---------------------------------------------------------
    // REGISTER PATIENT
    // ---------------------------------------------------------

    document.getElementById("registerForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        hideError("registerError");

        const patientData = {
            patient_id: document.getElementById("patientId").value.trim(),
            name: document.getElementById("name").value.trim(),
            age: Number(document.getElementById("age").value),
            gender: document.getElementById("gender").value,
            weight: Number(document.getElementById("weight").value),
            height: Number(document.getElementById("height").value)
        };

        if (!patientData.patient_id || !patientData.name) {
            showError("registerError", "Patient ID and name are required.");
            return;
        }

        const { data, error } = await db
            .from("Patients")
            .insert(patientData)
            .select()
            .single();

        if (error) {
            console.error("Patient registration error:", error);
            showError(
                "registerError",
                `Registration failed: ${formatError(error)}`
            );
            return;
        }

        currentPatient = data;
        setPatientId(data.patient_id);

        alert("Patient registered successfully!");
        document.getElementById("registerForm").reset();
        showPage("profile");
    });

    // ---------------------------------------------------------
    // OLD PATIENT LOGIN
    // ---------------------------------------------------------

    document.getElementById("loginForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        hideError("loginError");

        const patientId = document
            .getElementById("loginPatientId")
            .value
            .trim();

        if (!patientId) {
            showError("loginError", "Please enter a Patient ID.");
            return;
        }

        const { data, error } = await db
            .from("Patients")
            .select("*")
            .eq("patient_id", patientId)
            .maybeSingle();

        if (error) {
            console.error("Patient lookup error:", error);
            showError("loginError", `Unable to find patient: ${formatError(error)}`);
            return;
        }

        if (!data) {
            showError("loginError", "Patient ID not found.");
            return;
        }

        currentPatient = data;
        setPatientId(data.patient_id);

        alert("Patient record found!");
        document.getElementById("loginForm").reset();
        showPage("profile");
    });

    // ---------------------------------------------------------
    // PATIENT PROFILE
    // ---------------------------------------------------------

    async function loadPatientProfile() {
        const patientId = getPatientId();

        if (!patientId) {
            showPage("home");
            return;
        }

        const { data, error } = await db
            .from("Patients")
            .select("*")
            .eq("patient_id", patientId)
            .maybeSingle();

        if (error || !data) {
            console.error("Profile loading error:", error);
            alert(
                error
                    ? `Unable to load patient information: ${formatError(error)}`
                    : "Patient record not found."
            );
            clearPatientSession();
            showPage("home");
            return;
        }

        currentPatient = data;

        document.getElementById("displayName").textContent = data.name || "-";
        document.getElementById("displayProfileName").textContent = data.name || "-";
        document.getElementById("displayPatientId").textContent = data.patient_id || "-";
        document.getElementById("displayAge").textContent = data.age ?? "-";
        document.getElementById("displayGender").textContent = data.gender || "-";
        document.getElementById("displayWeight").textContent =
            data.weight != null ? `${data.weight} kg` : "-";
        document.getElementById("displayHeight").textContent =
            data.height != null ? `${data.height} cm` : "-";
    }

    // ---------------------------------------------------------
    // MEDICAL IMAGES
    // ---------------------------------------------------------

    async function loadMedicalImages() {
        const patientId = requirePatient();
        const imageList = document.getElementById("imageList");

        if (!imageList || !patientId) return;

        setLoading("imageList");

        const { data, error } = await db
            .from("medical_images")
            .select("*")
            .eq("patient_id", patientId)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Medical image loading error:", error);
            imageList.innerHTML = `
                <div class="alert alert-danger">
                    ${escapeHtml(formatError(error))}
                </div>
            `;
            return;
        }

        if (!data || data.length === 0) {
            imageList.innerHTML = `
                <p class="text-muted">No medical image records found.</p>
            `;
            return;
        }

        imageList.innerHTML = data.map((image) => {
            const publicUrl = image.public_url || "";
            const imageTag = publicUrl && image.image_type !== "MRI"
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
                    <strong>${escapeHtml(image.file_name || "Medical Image")}</strong>
                    <br>
                    <small>
                        Type: ${escapeHtml(image.image_type || "-")}
                    </small>
                    ${imageTag}
                </div>
            `;
        }).join("");
    }

    document.getElementById("imageForm").addEventListener("submit", async (event) => {
        event.preventDefault();

        const patientId = requirePatient();
        if (!patientId) return;

        const fileInput = document.getElementById("medicalFile");
        const file = fileInput.files[0];
        const imageType = document.getElementById("imageType").value;

        if (!file) {
            alert("Please select an image.");
            return;
        }

        if (!imageType) {
            alert("Please select an image type.");
            return;
        }

        // Prevent accidentally uploading very large files from the browser.
        const maxSize = 50 * 1024 * 1024;

        if (file.size > maxSize) {
            alert("File is too large. Maximum allowed size is 50 MB.");
            return;
        }

        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storagePath = `${patientId}/${Date.now()}_${safeName}`;

        try {
            // 1. Upload the actual file to Supabase Storage.
            const { error: uploadError } = await db.storage
                .from(STORAGE_BUCKET)
                .upload(storagePath, file, {
                    cacheControl: "3600",
                    upsert: false
                });

            if (uploadError) {
                throw new Error(`Storage upload failed: ${uploadError.message}`);
            }

            // 2. Save the metadata in the database.
            const { data: publicData } = db.storage
                .from(STORAGE_BUCKET)
                .getPublicUrl(storagePath);

            const { error: recordError } = await db
                .from("medical_images")
                .insert({
                    patient_id: patientId,
                    file_name: file.name,
                    file_path: storagePath,
                    image_type: imageType,
                    public_url: publicData?.publicUrl || null
                });

            if (recordError) {
                // Try to remove the orphaned storage file if DB insert fails.
                await db.storage
                    .from(STORAGE_BUCKET)
                    .remove([storagePath]);

                throw new Error(`Database insert failed: ${recordError.message}`);
            }

            alert("Medical image uploaded successfully!");

            document.getElementById("imageForm").reset();
            await loadMedicalImages();
        } catch (error) {
            console.error("Medical image upload error:", error);
            alert(formatError(error, "Could not upload medical image."));
        }
    });

    // ---------------------------------------------------------
    // AI RESULTS
    // ---------------------------------------------------------

    window.loadAIResults = async function loadAIResults() {
        showPage("aiResults");

        const patientId = requirePatient();
        const resultsList = document.getElementById("resultsList");

        if (!patientId || !resultsList) return;

        setLoading("resultsList");

        const { data, error } = await db
            .from("ai_results")
            .select("*")
            .eq("patient_id", patientId)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("AI results loading error:", error);
            resultsList.innerHTML = `
                <div class="alert alert-danger">
                    ${escapeHtml(formatError(error))}
                </div>
            `;
            return;
        }

        if (!data || data.length === 0) {
            resultsList.innerHTML = `
                <p class="text-muted">No AI results available.</p>
            `;
            return;
        }

        resultsList.innerHTML = data.map((result) => `
            <div class="border rounded p-3 mb-3">
                <h5 class="fw-bold">AI Analysis Result</h5>

                <p>
                    <strong>OA Result:</strong>
                    ${escapeHtml(result.oa_result || "-")}
                </p>

                <p>
                    <strong>Meniscus Thickness:</strong>
                    ${escapeHtml(result.meniscus_thickness || "-")}
                </p>

                <p>
                    <strong>Implant Recommendation:</strong>
                    ${escapeHtml(result.implant_recommendation || "-")}
                </p>
            </div>
        `).join("");
    };


        tableBody.innerHTML = data.map((implant) => `
            <tr>
                <td>${escapeHtml(implant.manufacturer || "-")}</td>
                <td>${escapeHtml(implant.model || "-")}</td>
                <td>${escapeHtml(implant.size || "-")}</td>
                <td>${escapeHtml(implant.femur_ap || "-")}</td>
                <td>${escapeHtml(implant.femur_ml || "-")}</td>
                <td>${escapeHtml(implant.tibia_ap || "-")}</td>
                <td>${escapeHtml(implant.tibia_ml || "-")}</td>
            </tr>
        `).join("");
    };

    // ---------------------------------------------------------
    // LOGOUT
    // ---------------------------------------------------------

    window.logout = function logout() {
        clearPatientSession();
        showPage("home");
    };

    // ---------------------------------------------------------
    // STARTUP
    // ---------------------------------------------------------

    window.showPage("home");

    const savedPatientId = getPatientId();

    if (savedPatientId) {
        // Do not automatically open the profile. The ID is only restored
        // so the user can continue their current session.
        console.info("Saved patient session found.");
    }
})();
