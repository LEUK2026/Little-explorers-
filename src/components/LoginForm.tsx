import { signIn } from "@/app/actions/auth";
export function LoginForm({ admin = false, showError = false }: {admin?:boolean;showError?:boolean}) {
  return <div className="card form-wrap narrow">
    <span className="eyebrow">{admin?"Staff access":"Family access"}</span>
    <h1 style={{fontSize:"2.6rem"}}>{admin?"Admin sign in":"Parent portal"}</h1>
    <p>{admin?"Restricted to approved Little Explorers administrators. Two-factor authentication is required.":"Sign in to your private family space."}</p>
    {showError&&<p className="alert error" role="alert">We couldn't sign you in. Check your details and try again.</p>}
    <form action={signIn} className="stack"><input type="hidden" name="area" value={admin?"admin":"parent"}/>
      <div className="field"><label htmlFor="email">Email address</label><input id="email" type="email" name="email" autoComplete="username" required/></div>
      <div className="field"><label htmlFor="password">Password</label><input id="password" type="password" name="password" autoComplete="current-password" required/></div>
      <button className="btn" type="submit">Sign in securely →</button>
    </form>
  </div>;
}
