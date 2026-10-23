import { createBrowserRouter } from 'react-router-dom';
import { RootLayout } from '../layouts/RootLayout';
import { HomePage } from '../pages/Home/HomePage';
import { DashboardPage } from '../pages/Dashboard/DashboardPage';
import { PlannerPage } from '../pages/Planner/PlannerPage';
import { SummarizerPage } from '../pages/Summarizer/SummarizerPage';
import { QuizPage } from '../pages/Quiz/QuizPage';
import { ProgressPage } from '../pages/Progress/ProgressPage';
import { NotFoundPage } from '../pages/NotFound/NotFoundPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'planner',
        element: <PlannerPage />,
      },
      {
        path: 'summarizer',
        element: <SummarizerPage />,
      },
      {
        path: 'quiz',
        element: <QuizPage />,
      },
      {
        path: 'progress',
        element: <ProgressPage />,
      },
      {
        path: '404',
        element: <NotFoundPage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]);
