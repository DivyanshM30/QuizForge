# AI-Powered Exam Simulator

A comprehensive Next.js application that analyzes study documents, generates AI-powered MCQs using Gemini API, conducts timed quizzes, and provides detailed performance analytics.

## Features

- 📄 **Document Analysis**: Upload PDF, DOCX, or PPT files and extract text content
- 🤖 **AI Question Generation**: Uses Google Gemini 2.5 Flash to generate high-quality MCQs
- ⏱️ **Timed Quizzes**: Customizable time limits with countdown timer
- 📊 **Performance Analytics**: Detailed topic-wise performance analysis with visual charts
- 📈 **Quiz History**: Track your progress with localStorage-based history
- 🎨 **Modern UI**: Beautiful glassmorphism design with responsive layout
- ⚡ **Real-time Feedback**: Immediate feedback after each question with explanations

## Prerequisites

- Node.js 18+ and npm/yarn
- Google Gemini API Key ([Get one here](https://makersuite.google.com/app/apikey))

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
   
   Create a `.env.local` file in the root directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL=gemini-2.5-flash
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

1. **Upload Document**: Drag and drop or click to upload your study document (PDF, DOCX, or PPT)
2. **Configure Quiz**: Set the number of questions (5-50), time limit (5-120 minutes), and difficulty level
3. **Take Quiz**: Answer questions and receive immediate feedback with explanations
4. **View Results**: See your score, accuracy, topic-wise performance, and revision suggestions
5. **Review History**: Access past quiz results from the history page

## Project Structure

```
quizforge/
├── app/
│   ├── api/
│   │   ├── analyze-document/    # Document parsing endpoint
│   │   ├── generate-questions/   # AI question generation endpoint
│   │   └── save-quiz/            # Quiz result validation endpoint
│   ├── history/                  # Quiz history pages
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout
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
│   ├── types.ts                 # TypeScript type definitions
│   ├── gemini.ts                # Gemini API client
│   ├── document-parser.ts       # Document parsing utilities
│   └── quiz-utils.ts            # Quiz utility functions
├── store/
│   └── quiz-store.ts            # Zustand state management
└── package.json
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Your Google Gemini API key | Yes |
| `GEMINI_MODEL` | Gemini model to use (default: `gemini-2.5-flash`) | No |

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import your repository in [Vercel](https://vercel.com)
3. Add your `GEMINI_API_KEY` in the environment variables section
4. Deploy!

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- AWS Amplify
- Railway
- Render

Make sure to set the `GEMINI_API_KEY` environment variable in your deployment platform.

## File Size Limits

- Maximum file size: **10MB**
- Supported formats: PDF, DOCX, PPT, PPTX
- Larger files may require additional processing time

## Database

Quiz history is stored in **localStorage** for simplicity and zero-cost deployment. If you prefer a database solution (PostgreSQL, MongoDB, etc.), you can modify the `QuizHistory` component and create a corresponding API route.

## Technologies Used

- **Next.js 15**: React framework
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **Zustand**: State management
- **Recharts**: Data visualization
- **React Dropzone**: File uploads
- **Google Gemini API**: AI question generation
- **pdf-parse**: PDF parsing
- **mammoth**: DOCX parsing

## Troubleshooting

### API Key Issues
- Ensure your `GEMINI_API_KEY` is correctly set in `.env.local`
- Verify the API key is valid and has sufficient quota

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
