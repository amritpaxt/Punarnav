import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Amplify } from 'aws-amplify';
import { confirmSignIn, confirmSignUp, fetchAuthSession, getCurrentUser, signIn, signOut, signUp } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../amplify/data/resource';

type Profile = { id:string; societyId:string; role:'RESIDENT'|'COLLECTOR'|'ADMIN'; name:string; email:string; flatId?:string; status:'PENDING'|'ACTIVE'|'DEACTIVATED' };
type SignupDraft = { email:string; password:string; name:string; societyId:string; inviteCode:string; flatId:string };
const client=generateClient<Schema>();
const errorText=(error:unknown)=>error instanceof Error?error.message:'Request failed. Please try again.';

function Frame({children,onSignOut}:{children:ReactNode;onSignOut:()=>void}){return <main className="mx-auto min-h-screen max-w-5xl px-4 py-8"><header className="mb-8 flex items-center justify-between"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-ember via-coral to-saffron text-xl font-black text-white">P</div><div><b className="text-lg">Punarnav</b><p className="text-xs text-stone-500">AWS society workspace</p></div></div><button className="btn border border-orange-200 bg-white" onClick={onSignOut}>Sign out</button></header>{children}</main>}

function AwsLogin({ready,onResolved}:{ready:boolean;onResolved:()=>Promise<void>}){
  const [mode,setMode]=useState<'signin'|'signup'|'confirm'|'new-password'>('signin');
  const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [newPassword,setNewPassword]=useState('');const [code,setCode]=useState('');
  const [name,setName]=useState('');const [societyId,setSocietyId]=useState('');const [inviteCode,setInviteCode]=useState('');const [flatId,setFlatId]=useState('');
  const [signupDraft,setSignupDraft]=useState<SignupDraft|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const submit=async()=>{setBusy(true);setError('');try{
    if(mode==='signin'){
      const result=await signIn({username:email.trim().toLowerCase(),password});
      if(result.nextStep.signInStep==='CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED'){setMode('new-password');return}
      if(!result.isSignedIn)throw new Error(`Sign-in needs another step: ${result.nextStep.signInStep}`);
      await onResolved();return;
    }
    if(mode==='new-password'){
      const result=await confirmSignIn({challengeResponse:newPassword});
      if(!result.isSignedIn)throw new Error(`Password change needs another step: ${result.nextStep.signInStep}`);
      await onResolved();return;
    }
    if(mode==='signup'){
      const draft={email:email.trim().toLowerCase(),password,name:name.trim(),societyId:societyId.trim(),inviteCode:inviteCode.trim(),flatId:flatId.trim()};
      if(!draft.name||!draft.societyId||!draft.inviteCode||!draft.flatId)throw new Error('Complete your name, society ID, society invite code, and flat ID.');
      const result=await signUp({username:draft.email,password:draft.password,options:{userAttributes:{email:draft.email,given_name:draft.name.split(/\s+/)[0],family_name:draft.name.trim().split(/\s+/).slice(1).join(' ')||draft.name.trim()}}});
      setSignupDraft(draft);
      if(result.nextStep.signUpStep==='CONFIRM_SIGN_UP'){setMode('confirm');return}
      throw new Error(`Sign-up needs another step: ${result.nextStep.signUpStep}`);
    }
    if(mode==='confirm'){
      const draft=signupDraft;if(!draft)throw new Error('Signup details expired. Start again.');
      await confirmSignUp({username:draft.email,confirmationCode:code.trim()});
      const signed=await signIn({username:draft.email,password:draft.password});
      if(!signed.isSignedIn)throw new Error('Email confirmed. Sign in to finish joining the society.');
      const result=await client.mutations.registerResident({societyId:draft.societyId,inviteCode:draft.inviteCode,flatId:draft.flatId,name:draft.name});
      if(result.errors?.length)throw new Error(result.errors.map(item=>item.message).join('; '));
      await onResolved();return;
    }
  }catch(e){setError(errorText(e))}finally{setBusy(false)}};
  return <main className="grid min-h-screen place-items-center px-4 py-10"><section className="card w-full max-w-lg"><p className="eyebrow">AWS Cognito sign-in</p><h1 className="mt-2 text-3xl font-extrabold">{mode==='signup'?'Join your society':mode==='confirm'?'Confirm your email':mode==='new-password'?'Set a new password':'Welcome back'}</h1><p className="mt-2 text-sm text-stone-500">{mode==='signup'?'Create a resident account. Society admin approval is required.':mode==='confirm'?'Enter the confirmation code sent to your email.':mode==='new-password'?'Your invitation password is temporary. Choose a new password to continue.':'Sign in with your society account.'}</p>
    {mode==='signup'&&<><label className="mt-4 block text-sm font-bold">Name</label><input className="field mt-2" value={name} onChange={e=>setName(e.target.value)} autoComplete="name"/><label className="mt-4 block text-sm font-bold">Society ID</label><input className="field mt-2" value={societyId} onChange={e=>setSocietyId(e.target.value)}/><label className="mt-4 block text-sm font-bold">Society invite code</label><input className="field mt-2" value={inviteCode} onChange={e=>setInviteCode(e.target.value)}/><label className="mt-4 block text-sm font-bold">Flat ID</label><input className="field mt-2" value={flatId} onChange={e=>setFlatId(e.target.value)}/></>}
    {mode==='confirm'&&<><label className="mt-5 block text-sm font-bold">Email confirmation code</label><input className="field mt-2" value={code} onChange={e=>setCode(e.target.value)} autoComplete="one-time-code"/></>}
    {mode==='new-password'&&<><label className="mt-5 block text-sm font-bold">New password</label><input className="field mt-2" type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} autoComplete="new-password"/></>}
    {(mode==='signin'||mode==='signup')&&<><label className="mt-4 block text-sm font-bold">Email</label><input className="field mt-2" type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/><label className="mt-4 block text-sm font-bold">{mode==='signup'?'Create password':'Password'}</label><input className="field mt-2" type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==='signup'?'new-password':'current-password'}/></>}
    {error&&<p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-800">{error}</p>}
    <button disabled={!ready||busy} className="btn-primary mt-5 w-full" onClick={()=>void submit()}>{busy?'Please wait…':mode==='signin'?'Sign in':mode==='signup'?'Create resident account':mode==='confirm'?'Confirm and join':'Set password and continue'}</button>
    {mode==='signin'&&<button disabled={busy} className="mt-4 w-full text-sm font-bold text-ember" onClick={()=>{setMode('signup');setError('')}}>New resident? Create an account</button>}
    {(mode==='signup'||mode==='confirm')&&<button disabled={busy} className="mt-3 w-full text-sm font-bold text-ember" onClick={()=>{setMode('signin');setError('')}}>Back to sign in</button>}
    {!ready&&<p className="mt-4 text-xs text-stone-500">Waiting for Amplify configuration. Copy the generated backend outputs as described in the setup instructions.</p>}
  </section></main>
}

function Pending({profile,onRefresh,onSignOut,busy,error}:{profile:Profile;onRefresh:()=>void;onSignOut:()=>void;busy:boolean;error:string}){return <Frame onSignOut={onSignOut}><section className="card mx-auto max-w-xl text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-yellow-100 text-2xl">⌛</div><p className="eyebrow mt-4">Resident account · {profile.email}</p><h1 className="mt-2 text-3xl font-extrabold">Waiting for approval</h1><p className="mt-3 text-sm leading-relaxed text-stone-600">Your signup is saved. A society admin must approve your account before you can use Punarnav. This page will update when your profile is activated.</p>{error&&<p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}<div className="mt-5 flex justify-center gap-3"><button className="btn-primary" disabled={busy} onClick={onRefresh}>{busy?'Refreshing…':'Refresh status'}</button><button className="btn border border-orange-200" onClick={onSignOut}>Sign out</button></div></section></Frame>}

function AdminPeople({profile,people,onRefresh,onAction,onSignOut}:{profile:Profile;people:Profile[];onRefresh:()=>Promise<void>;onAction:(action:string,payload:Record<string,string>)=>Promise<void>;onSignOut:()=>void}){
  const [email,setEmail]=useState('');const [name,setName]=useState('');const [role,setRole]=useState<'COLLECTOR'|'ADMIN'>('COLLECTOR');const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [notice,setNotice]=useState('');
  const run=async(action:string,payload:Record<string,string>)=>{setBusy(true);setError('');setNotice('');try{await onAction(action,payload);setNotice('Request completed. Refreshing society accounts…');await onRefresh()}catch(e){setError(errorText(e))}finally{setBusy(false)}};
  const invite=async()=>{await run('inviteUser',{email:email.trim(),name:name.trim(),role});setEmail('');setName('')};
  const pending=people.filter(person=>person.status==='PENDING');
  return <Frame onSignOut={onSignOut}><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow">{profile.name} · {profile.societyId}</p><h1 className="mt-1 text-3xl font-extrabold">People and access</h1></div><button disabled={busy} className="btn border border-orange-200 bg-white" onClick={()=>void onRefresh()}>Refresh list</button></div>
    {error&&<p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-800">{error}</p>}{notice&&<p role="status" className="mt-4 rounded-xl bg-green-50 p-3 text-sm font-bold text-green-800">{notice}</p>}
    <section className="card mt-5"><p className="eyebrow">Resident approval queue</p><h2 className="mt-1 text-xl font-extrabold">Pending residents ({pending.length})</h2>{pending.map(person=><div key={person.id} className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-orange-50 p-4"><div><b>{person.name}</b><p className="text-sm text-stone-600">{person.email} · Flat {person.flatId??'not assigned'}</p></div><div className="flex gap-2"><button disabled={busy} className="btn-primary" onClick={()=>void run('approveResident',{profileId:person.id})}>Approve</button><button disabled={busy} className="btn border border-orange-200 bg-white" onClick={()=>void run('rejectResident',{profileId:person.id})}>Reject</button></div></div>)}{pending.length===0&&<p className="mt-3 text-sm text-stone-500">No residents are waiting for approval.</p>}</section>
    <section className="card mt-4"><p className="eyebrow">Invite staff</p><h2 className="mt-1 text-xl font-extrabold">Collector or admin</h2><p className="mt-1 text-sm text-stone-500">Cognito emails a temporary password. The user must set a new password at first sign-in.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm font-bold">Name<input className="field mt-2" value={name} onChange={e=>setName(e.target.value)}/></label><label className="text-sm font-bold">Email<input className="field mt-2" type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><label className="text-sm font-bold">Role<select className="field mt-2" value={role} onChange={e=>setRole(e.target.value as 'COLLECTOR'|'ADMIN')}><option value="COLLECTOR">Collector</option><option value="ADMIN">Admin</option></select></label><div className="flex items-end"><button disabled={busy||!name.trim()||!email.trim()} className="btn-warm w-full" onClick={()=>void invite()}>Send invitation</button></div></div></section>
    <section className="card mt-4"><p className="eyebrow">Society accounts</p><h2 className="mt-1 text-xl font-extrabold">Manage active access</h2><div className="mt-3 divide-y divide-orange-100">{people.filter(person=>person.status!=='PENDING').map(person=><div key={person.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><b>{person.name}</b><p className="text-sm text-stone-500">{person.email} · {person.role} · {person.status}</p></div>{person.id!==profile.id&&<button disabled={busy} className={`btn ${person.status==='DEACTIVATED'?'btn-warm':'border border-orange-200 bg-white'}`} onClick={()=>void run(person.status==='DEACTIVATED'?'reactivateUser':'deactivateUser',{profileId:person.id})}>{person.status==='DEACTIVATED'?'Reactivate':'Deactivate'}</button>}</div>)}</div></section>
    <p className="mt-4 text-xs text-stone-500">AWS Step 1: accounts and people. Resident, collector, and other dashboard data will be connected in the following steps.</p>
  </Frame>
}

export default function AwsApp(){
  const [ready,setReady]=useState(false);const [loading,setLoading]=useState(true);const [profile,setProfile]=useState<Profile|null>(null);const [people,setPeople]=useState<Profile[]>([]);const [error,setError]=useState('');
  useEffect(()=>{let alive=true;(async()=>{try{const response=await fetch('/amplify_outputs.json',{cache:'no-store'});if(!response.ok)throw new Error('Could not load /amplify_outputs.json. Run the sandbox setup and copy its generated outputs.');const config=await response.json();Amplify.configure(config);if(alive)setReady(true)}catch(e){if(alive)setError(errorText(e))}finally{if(alive)setLoading(false)}})();return()=>{alive=false}},[]);
  const loadProfile=useCallback(async(forceRefresh=false)=>{setLoading(true);setError('');try{if(forceRefresh)await fetchAuthSession({forceRefresh:true});await getCurrentUser();const result=await client.queries.myProfile();if(result.errors?.length)throw new Error(result.errors.map(item=>item.message).join('; '));const record=(result.data as {profile?:Profile|null}|null)?.profile??null;setProfile(record);if(record?.status==='ACTIVE'&&record.role==='ADMIN'){const listed=await client.queries.listSocietyPeople();if(listed.errors?.length)throw new Error(listed.errors.map(item=>item.message).join('; '));setPeople(((listed.data as {people?:Profile[]}|null)?.people??[]))}else setPeople([])}catch(e){setProfile(null);setError(errorText(e))}finally{setLoading(false)}},[]);
  useEffect(()=>{if(ready)void loadProfile()},[ready,loadProfile]);
  const logout=async()=>{try{await signOut()}finally{setProfile(null);setPeople([])}};
  const adminAction=async(action:string,payload:Record<string,string>)=>{const result=await client.mutations.adminAction({action,payload});if(result.errors?.length)throw new Error(result.errors.map(item=>item.message).join('; '));if((result.data as {ok?:boolean}|null)?.ok!==true)throw new Error('The server did not confirm the account change.')};
  if(!ready)return <main className="grid min-h-screen place-items-center px-4"><section className="card w-full max-w-lg"><h1 className="text-2xl font-extrabold">AWS configuration</h1><p className="mt-3 text-sm text-stone-600">{loading?'Loading Amplify outputs…':error}</p><p className="mt-3 text-xs text-stone-500">Expected file: <code>/amplify_outputs.json</code>. Local demo remains available when <code>VITE_BACKEND</code> is unset.</p></section></main>;
  if(loading)return <main className="grid min-h-screen place-items-center"><p className="font-bold text-stone-600">Loading your society account…</p></main>;
  if(!profile)return <><AwsLogin ready={ready} onResolved={loadProfile}/>{error&&<div role="alert" className="fixed bottom-4 left-1/2 z-50 max-w-lg -translate-x-1/2 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-800">{error}</div>}</>;
  if(profile.status==='PENDING')return <Pending profile={profile} onRefresh={()=>void loadProfile(true)} onSignOut={()=>void logout()} busy={loading} error={error}/>;
  if(profile.status!=='ACTIVE')return <Frame onSignOut={()=>void logout()}><section className="card mx-auto max-w-xl"><h1 className="text-2xl font-extrabold">Account unavailable</h1><p className="mt-2 text-sm text-stone-600">Your access is deactivated or your account profile is missing. Contact your society admin.</p></section></Frame>;
  if(profile.role==='ADMIN')return <AdminPeople profile={profile} people={people} onRefresh={loadProfile} onAction={adminAction} onSignOut={()=>void logout()}/>;
  return <Frame onSignOut={()=>void logout()}><section className="card mx-auto max-w-xl"><p className="eyebrow">{profile.role} · {profile.name}</p><h1 className="mt-2 text-2xl font-extrabold">Account access is active</h1><p className="mt-2 text-sm text-stone-600">You are signed in to the AWS-backed society. Remaining {profile.role.toLowerCase()} screens will move to AWS in the next steps.</p></section></Frame>;
}
