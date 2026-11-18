"use client";
import {useState} from "react";
export function SpecialNeedsFields({initialYes=false,initialDetails=""}:{initialYes?:boolean;initialDetails?:string}){
  const [needs,setNeeds]=useState(initialYes?"yes":"no");
  return <><fieldset style={{border:"1px solid var(--line)",borderRadius:"12px",padding:".8rem"}}><legend style={{fontWeight:700}}>Does your child have additional support needs?</legend>
    <label style={{marginRight:"1.5rem"}}><input type="radio" name="special_needs" value="yes" checked={needs==="yes"} onChange={()=>setNeeds("yes")}/> Yes</label>
    <label><input type="radio" name="special_needs" value="no" checked={needs==="no"} onChange={()=>setNeeds("no")}/> No</label>
  </fieldset>{needs==="yes"&&<div className="field"><label htmlFor="special_needs_details">Please tell us about the support needed *</label><textarea id="special_needs_details" name="special_needs_details" minLength={1} maxLength={4000} required defaultValue={initialDetails}/></div>}</>;
}
