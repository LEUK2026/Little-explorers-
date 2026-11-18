"use client";
export default function Error({reset}:{error:Error&{digest?:string};reset:()=>void}){
  return <main className="container section"><div className="card form-wrap narrow"><span className="emoji" aria-hidden="true">🌱</span><h1 style={{fontSize:"2.5rem"}}>Oops, something didn't quite work.</h1><p>We couldn't complete that request. Your information hasn't been deliberately shared. Please try again, or contact Little Explorers if the problem continues.</p><button className="btn" onClick={reset}>Try again</button></div></main>;
}
