import AuthLayout from "../../components/auth/AuthLayout";
import AuthForm from "../../components/auth/AuthForm";
export default function Register() {
  return <AuthLayout title="Start your journey" description="Create your GreenMile account, then connect your vehicle."><AuthForm registering /></AuthLayout>;
}
