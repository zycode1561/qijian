const paths={
 home:'M3 10 12 3l9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z M9 21v-8h6v8',
 folder:'M3 7V5h6l2 2h10v13H3z',plus:'M12 5v14 M5 12h14',chevron:'m9 5 7 7-7 7',
 plan:'M3 3h18v18H3z M3 12h9 M12 3v18 M12 15h9',sofa:'M5 12V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v5 M3 11h3v6h12v-6h3v9H3z M6 20v2 M18 20v2',
 template:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
 undo:'M9 4 3 10l6 6 M3 10h11a6 6 0 0 1 0 12',redo:'m15 4 6 6-6 6 M21 10H10a6 6 0 0 0 0 12',
 export:'M12 15V3 m-5 5 5-5 5 5 M4 14v7h16v-7',check:'m5 12 4 4L19 6',settings:'M4 7h16 M4 17h16 M8 4v6 M16 14v6',
 cube:'m12 2 10 5v10l-10 5-10-5V7z M2 7l10 5 10-5 M12 12v10',walk:'M14 4a2 2 0 1 0 0 .1 M8 22l4-7 M17 22l-3-8 1-6 M8 11l3-4h4l3 5 3 1 M4 16l5-3 1-4',
 cross:'m6 6 12 12 M6 18 18 6',help:'M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 3 M12 17v.1 M22 12a10 10 0 1 0-20 0 10 10 0 0 0 20 0',
 copy:'M8 8h13v13H8z M16 8V3H3v13h5',trash:'M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7',
 lock:'M6 10h12v11H6z M8 10V6a4 4 0 0 1 8 0v4',rotate:'M20 9a8 8 0 1 0 0 8 M20 3v6h-6',
 fit:'M3 9V3h6 M15 3h6v6 M21 15v6h-6 M9 21H3v-6',cursor:'m4 3 5 18 4-7 7-4z',hand:'M5 12V8a1 1 0 0 1 2 0v3-6a1 1 0 0 1 2 0v6-8a1 1 0 0 1 2 0v8-7a1 1 0 0 1 2 0v8l2-3a2 2 0 0 1 3 2l-4 9H8z',
 leaf:'M20 3C8 1 2 8 6 16c8 6 16-2 14-13 M6 19 16 8',eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12 M15 12a3 3 0 1 0-6 0 3 3 0 0 0 6 0',
 image:'M3 3h18v18H3z M3 17l6-6 4 4 4-6 4 7 M8 7h.1',group:'M3 3h6v6H3z M15 3h6v6h-6z M3 15h6v6H3z M15 15h6v6h-6z M9 6h6 M6 9v6 M18 9v6 M9 18h6',
 solo:'M4 4h16v16H4z M4 12h9v8 M13 4v8 M16 7h2 M6 7h4',family:'M3 4h18v16H3z M3 13h9 M12 4v16 M15 9h3 M15 14h3',cats:'M3 3h18v18H3z M3 10h8 M11 3v18 M11 15h10 M14 6h4',
};
export const icon=(name,size=18)=>`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]??paths.plan}"/></svg>`;
