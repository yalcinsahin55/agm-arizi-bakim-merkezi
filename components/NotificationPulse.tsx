'use client';import {useEffect} from 'react';
export default function NotificationPulse(){useEffect(()=>{const id=setInterval(()=>{fetch('/api/notifications',{cache:'no-store'}).catch(()=>{})},10000);return()=>clearInterval(id)},[]);return null}
