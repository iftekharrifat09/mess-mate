import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import AboutUs from "./pages/AboutUs";
import JoinMess from "./pages/JoinMess";
import WaitingApproval from "./pages/WaitingApproval";
import ManageMess from "./pages/ManageMess";
import Dashboard from "./pages/Dashboard";
import Members from "./pages/Members";
import Meals from "./pages/Meals";
import Deposits from "./pages/Deposits";
import MealCosts from "./pages/MealCosts";
import OtherCosts from "./pages/OtherCosts";
import MonthDetails from "./pages/MonthDetails";
import JoinRequests from "./pages/JoinRequests";
import Notices from "./pages/Notices";
import BazarDates from "./pages/BazarDates";
import Notes from "./pages/Notes";
import Profile from "./pages/Profile";
import EditCalendar from "./pages/EditCalendar";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/about" element={<AboutUs />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/login" element={<Navigate to="/auth" replace />} />
              <Route path="/join-mess" element={<JoinMess />} />
              <Route path="/waiting-approval" element={<WaitingApproval />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/members" element={<Members />} />
              <Route path="/meals" element={<Meals />} />
              <Route path="/deposits" element={<Deposits />} />
              <Route path="/meal-costs" element={<MealCosts />} />
              <Route path="/other-costs" element={<OtherCosts />} />
              <Route path="/month-details" element={<MonthDetails />} />
              <Route path="/join-requests" element={<JoinRequests />} />
              <Route path="/manage-mess" element={<ManageMess />} />
              <Route path="/notices" element={<Notices />} />
              <Route path="/bazar-dates" element={<BazarDates />} />
              <Route path="/notes" element={<Notes />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/edit-calendar" element={<EditCalendar />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
