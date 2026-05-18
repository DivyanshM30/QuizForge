# QuizForge by Divyansh Mishra

A comprehensive Next.js application that analyzes study documents, generates AI-powered MCQs using Gemini API, conducts timed quizzes, and provides detailed performance analytics.

## Features

- 📄 **Document Analysis**: Upload PDF, DOCX, or PPT files and extract text content
- 🤖 **AI Question Generation**: Uses Google Gemini 2.5 Flash to generate high-quality MCQs
- ⏱️ **Timed Quizzes**: Customizable time limits with countdown timer
- 📊 **Performance Analytics**: Detailed topic-wise performance analysis with visual charts
- 🔒 **Secure Authentication**: Secure user registration and login powered by NextAuth.js and bcryptjs
- 📈 **Persistent History**: Track your progress with PostgreSQL database storage using Prisma ORM
- 🎨 **Modern UI**: Beautiful glassmorphism design with responsive layout
- ⚡ **Real-time Feedback**: Immediate feedback after each question with explanations

## Prerequisites

- Node.js 18+ and npm/yarn
- Google Gemini API Key ([Get one here](https://makersuite.google.com/app/apikey))
- PostgreSQL Database (e.g., Neon or Supabase)

## Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/DivyanshM30/QuizForge
   cd quizforge
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="postgresql://username:password@host/database"
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL=gemini-2.5-flash
   NEXTAUTH_SECRET=your_super_secret_key_here
   ```

4. **Initialize Database**
   ```bash
   npx prisma db push
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

1. **Create an Account**: Register or log in to track your quizzes
2. **Upload Document**: Drag and drop or click to upload your study document (PDF, DOCX, or PPT)
3. **Configure Quiz**: Set the number of questions (5-50), time limit (5-120 minutes), and difficulty level
4. **Take Quiz**: Answer questions and receive immediate feedback with explanations
5. **View Results**: See your score, accuracy, topic-wise performance, and revision suggestions
6. **Review History**: Access past quiz results securely saved in the database from the history page

## Project Structure

```
quizforge/
├── app/
│   ├── api/
│   │   ├── analyze-document/    # Document parsing endpoint
│   │   ├── auth/[...nextauth]/  # NextAuth API routes
│   │   ├── generate-questions/  # AI question generation endpoint
│   │   ├── history/             # User history API endpoints
│   │   ├── register/            # User registration API endpoint
│   │   └── save-quiz/           # Quiz result saving endpoint
│   ├── history/                 # Quiz history pages
│   ├── login/                   # Login page
│   ├── register/                # Registration page
│   ├── upload/                  # Quiz configuration & upload page
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout with SessionProvider
│   └── page.tsx                 # Main landing page
├── components/
│   ├── FileUpload.tsx           # Document upload component
│   ├── QuizConfig.tsx           # Quiz configuration component
│   ├── QuizInterface.tsx        # Main quiz interface
│   ├── Timer.tsx                # Countdown timer
│   ├── FeedbackModal.tsx        # Answer feedback modal
│   ├── ResultsDashboard.tsx     # Results display
│   ├── QuizHistory.tsx          # History viewer
│   └── LoadingSpinner.tsx       # Loading states
├── lib/
│   ├── auth.ts                  # NextAuth configuration options
│   ├── types.ts                 # TypeScript type definitions
│   ├── gemini.ts                # Gemini API client
│   ├── document-parser.ts       # Document parsing utilities
│   ├── prisma.ts                # Prisma Client instance
│   └── quiz-utils.ts            # Quiz utility functions
├── prisma/
│   └── schema.prisma            # Prisma database schema definitions
├── store/
│   └── quiz-store.ts            # Zustand state management
└── package.json
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `GEMINI_API_KEY` | Your Google Gemini API key | Yes |
| `GEMINI_MODEL` | Gemini model to use (default: `gemini-2.5-flash`) | No |
| `NEXTAUTH_SECRET`| Secret key used to encrypt session tokens | Yes |

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import your repository in [Vercel](https://vercel.com)
3. Add your `DATABASE_URL`, `GEMINI_API_KEY`, `NEXTAUTH_SECRET`, and `NEXTAUTH_URL` in the environment variables section
4. Deploy!

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- AWS Amplify
- Railway
- Render

Make sure to set the `GEMINI_API_KEY` and `NEXTAUTH_SECRET` environment variables.

## File Size Limits

- Maximum file size: **10MB**
- Supported formats: PDF, DOCX, PPT, PPTX
- Larger files may require additional processing time

## Database

Quiz history and user accounts are stored in a **PostgreSQL** database (e.g., Neon or Supabase) managed by **Prisma ORM**, ensuring fast, reliable, and persistent storage optimized for serverless hosting on Vercel.

## Technologies Used

- **Next.js 15**: React framework
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **NextAuth.js**: Authentication
- **Prisma**: Database ORM
- **PostgreSQL**: Production and development database
- **Zustand**: State management
- **Recharts**: Data visualization
- **React Dropzone**: File uploads
- **Google Gemini API**: AI question generation
- **bcryptjs**: Serverless-compatible password hashing

## Troubleshooting

### API Key Issues
- Ensure your `GEMINI_API_KEY` is correctly set in `.env.local`
- Verify the API key is valid and has sufficient quota

### Authentication Issues
- Ensure `NEXTAUTH_SECRET` is defined in your environment variables
- Run `npx prisma db push` if you encounter database query errors related to missing tables

### Document Parsing Errors
- Ensure files are in supported formats (PDF, DOCX, PPT)
- Check file size is under 10MB
- Try converting PPT files to PDF for better compatibility

### Question Generation Fails
- Check your Gemini API quota
- Verify the document text was extracted correctly
- Try reducing the number of questions

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
