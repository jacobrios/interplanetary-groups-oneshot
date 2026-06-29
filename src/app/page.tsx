import { redirect } from "next/navigation"

// Root route: redirect to the create-group onboarding flow.
// A future fast-follow will route returning sessions to their group home
// or a multi-group home screen; for now, the product entry point is creating a group.
export default function Home() {
  redirect("/create")
}
