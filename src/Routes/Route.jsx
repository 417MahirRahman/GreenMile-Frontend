import { createBrowserRouter } from "react-router";

import Home from "../pages/Home/Home";

import Login from "../pages/Auth/Login";

import Register from "../pages/Auth/Register";

import VehicleSetup from "../pages/VehicleSetup/VehicleSetup";

import ProtectedRoute from "../components/ProtectedRoute";

import VehicleRequiredRoute from "../components/VehicleRequiredRoute";

export const router = createBrowserRouter([
  // =================================================
  // HOME
  // =================================================

  {
    path: "/",

    element: (
      <ProtectedRoute>
        <VehicleRequiredRoute>
          <Home />
        </VehicleRequiredRoute>
      </ProtectedRoute>
    ),
  },

  // =================================================
  // VEHICLE SETUP
  // =================================================

  {
    path: "/vehicle-setup",

    element: (
      <ProtectedRoute>
        <VehicleSetup />
      </ProtectedRoute>
    ),
  },

  // =================================================
  // LOGIN
  // =================================================

  {
    path: "/login",

    element: <Login />,
  },

  // =================================================
  // REGISTER
  // =================================================

  {
    path: "/register",

    element: <Register />,
  },
]);
