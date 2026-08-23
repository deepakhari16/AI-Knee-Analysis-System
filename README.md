# AI Knee Analysis System

AI-assisted knee osteoarthritis assessment and TKA planning web application.

## Project structure

```text
ai-knee-analysis-system/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── app.js
│   ├── config.example.js
│   └── config.js          # local only, ignored by Git
├── .gitignore
└── README.md
```

## 1. Configure Supabase

Copy:

```text
js/config.example.js
```

to:

```text
js/config.js
```

Then add your Supabase URL and browser-safe publishable/anon key.

Do NOT use a `service_role` or secret key in frontend JavaScript.

## 2. Supabase database tables expected

The current frontend expects these tables/columns:

### Patients

- patient_id
- name
- age
- gender
- weight
- height

### medical_images

- patient_id
- file_name
- file_path
- image_type
- public_url
- created_at (recommended)

### ai_results

- patient_id
- oa_result
- meniscus_thickness
- implant_recommendation
- created_at (recommended)

### implants

- manufacturer
- model
- size
- femur_ap
- femur_ml
- tibia_ap
- tibia_ml

## 3. Storage

Create a Supabase Storage bucket named:

```text
medical-images
```

The JavaScript uploads the actual file to Storage and stores its metadata in `medical_images`.

For medical images, prefer a PRIVATE bucket and authenticated/server-side signed URLs in a real deployment. The current demo uses a public URL field for simple browser display.

## 4. Important security note

This project currently uses Patient ID as the application-level identifier. It is NOT a complete medical authentication system.

For a real healthcare deployment, add:

- Supabase Auth
- proper user/patient ownership relationships
- Row Level Security (RLS)
- private Storage bucket
- signed URLs
- server-side AI inference
- audit logging
- strict access control
- clinical validation and regulatory review

## 5. Run locally

Because the project uses browser JavaScript modules/configuration and Supabase, run it through a local web server.

For VS Code, install/use Live Server and open `index.html`.

Or use Python:

```bash
python -m http.server 5500
```

Then open:

```text
http://localhost:5500
```

## 6. GitHub

Initialize the repository:

```bash
git init
git add .
git commit -m "Initial AI knee analysis system"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

`js/config.js` is intentionally ignored so your local configuration is not committed.

## Current architecture

```text
Browser
   │
   ├── index.html
   ├── css/styles.css
   └── js/app.js
          │
          ▼
      Supabase
       ├── Patients
       ├── medical_images
       ├── ai_results
       ├── implants
       └── Storage / medical-images
```

The AI/Featherless integration is not included yet. It should be connected through a secure backend/serverless function rather than exposing an AI API key in frontend JavaScript.
