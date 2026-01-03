import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Login from "./pages/Login";
import ManagerRegister from "./pages/ManagerRegister";
import MemberRegister from "./pages/MemberRegister";
import Dashboard from "./pages/Dashboard";
import Members from "./pages/Members";
import Meals from "./pages/Meals";
import Deposits from "./pages/Deposits";
import MealCosts from "./pages/MealCosts";
import OtherCosts from "./pages/OtherCosts";
import MonthDetails from "./pages/MonthDetails";
import JoinRequests from "./pages/JoinRequests";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register/manager" element={<ManagerRegister />} />
            <Route path="/register/member" element={<MemberRegister />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/members" element={<Members />} />
            <Route path="/meals" element={<Meals />} />
            <Route path="/deposits" element={<Deposits />} />
            <Route path="/meal-costs" element={<MealCosts />} />
            <Route path="/other-costs" element={<OtherCosts />} />
            <Route path="/month-details" element={<MonthDetails />} />
            <Route path="/join-requests" element={<JoinRequests />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
