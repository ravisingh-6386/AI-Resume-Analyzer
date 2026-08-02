# AI Resume Analyzer

https://www.youtube.com/watch?v=VsF4jCFtpe4&t=5s


AI Resume Analyzer is a full-stack project for uploading, parsing, and analyzing resumes with AI-powered feedback.

## Repository Structure

```text
ai-resume-analyzer/
├── app/
│   └── components/
│       └── LoginForm.tsx
├── backend/
│   ├── AUTH_GUIDE.md
│   └── server/
│       ├── index.js
│       ├── config/
│       │   ├── db.js
│       │   └── env.js
│       ├── models/
│       │   ├── OtpSession.js
│       │   ├── PasswordResetSession.js
│       │   └── User.js
│       ├── routes/
│       │   └── authRoutes.js
│       └── services/
│           ├── mailer.js
│           └── otpService.js
├── build/
│   ├── client/
│   └── server/
├── frontend/
│   ├── README.md
│   ├── QUICK_START.md
│   ├── IMPLEMENTATION_SUMMARY.md
│   ├── app/
│   │   ├── app.css
│   │   ├── root.tsx
│   │   ├── routes.ts
│   │   ├── components/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── SignupForm.tsx
│   │   │   ├── Navbar.tsx
│   │   │   ├── Summary.tsx
│   │   │   └── ...
│   │   ├── lib/
│   │   │   ├── auth.ts
│   │   │   ├── pdf2img.ts
│   │   │   ├── puter.ts
│   │   │   ├── testSetup.ts
│   │   │   └── utils.ts
│   │   └── routes/
│   │       ├── auth.tsx
│   │       ├── home.tsx
│   │       ├── resume.tsx
│   │       ├── upload.tsx
│   │       └── wipe.tsx
│   ├── constants/
│   │   └── index.ts
│   ├── public/
│   │   ├── icons/
│   │   ├── images/
│   │   ├── readme/
│   │   └── pdf.worker.min.mjs
│   ├── types/
│   │   ├── index.d.ts
│   │   └── puter.d.ts
│   ├── build/
│   ├── react-router.config.ts
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
├── Dockerfile
├── package.json
├── react-router.config.ts
└── vite.config.ts
```

## Documentation

- Frontend guide: [frontend/README.md](frontend/README.md)
- Quick start: [frontend/QUICK_START.md](frontend/QUICK_START.md)
- Implementation details: [frontend/IMPLEMENTATION_SUMMARY.md](frontend/IMPLEMENTATION_SUMMARY.md)
- Backend auth guide: [backend/AUTH_GUIDE.md](backend/AUTH_GUIDE.md)
