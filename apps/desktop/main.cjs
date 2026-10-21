const {app,BrowserWindow,dialog,session}=require('electron');
const path=require('node:path');
const crypto=require('node:crypto');
const fs=require('node:fs');
const {allowedNavigation,windowOptions,prepareDesktopSession}=require('./policy.cjs');
let service,win,closing=false;
if(!app.requestSingleInstanceLock())app.quit();
else {
 app.on('second-instance',()=>{if(win){if(win.isMinimized())win.restore();win.focus();}});
 app.whenReady().then(async()=>{
  process.env.WATCHTV_PUBLIC_DNS ||= 'cloudflare';
  const root=app.isPackaged?app.getAppPath():path.resolve(__dirname,'../..');
  const {createApp}=require(path.join(root,'dist/app.cjs'));
  const token=crypto.randomBytes(32).toString('hex');
  service=await createApp({password:token,desktopToken:token,staticRoot:path.join(root,'dist/web')});
  // A stable loopback origin preserves IndexedDB and source settings between launches.
  const origin=await service.listen({host:'127.0.0.1',port:3211});
  await prepareDesktopSession(session.defaultSession);
  win=new BrowserWindow({width:1440,height:940,minWidth:390,minHeight:640,show:false,backgroundColor:'#111512',title:'WatchTV',icon:path.join(root,'apps/desktop/icon.png'),autoHideMenuBar:true,webPreferences:windowOptions});
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',(event,url)=>{if(!allowedNavigation(url,origin))event.preventDefault();});
  win.webContents.on('will-attach-webview',event=>event.preventDefault());
  await win.loadURL(`${origin}/desktop-auth?token=${token}`);
  win.show();
  if(process.argv.includes('--smoke-test')){
   const {net}=require('electron');
   const response=await net.fetch(`${origin}/health`);
   let rendered=false;
   for(let i=0;i<40&&!rendered;i++){
    rendered=await win.webContents.executeJavaScript("Boolean(document.querySelector('#root .catalog-topbar'))");
    if(!rendered)await new Promise(resolve=>setTimeout(resolve,250));
   }
   const report={loaded:!win.webContents.isLoading(),rendered,title:win.getTitle(),health:await response.json(),sandbox:windowOptions.sandbox};
   const output=process.env.WATCHTV_SMOKE_DIR||path.join(app.isPackaged?app.getPath('userData'):root,'.local');fs.mkdirSync(output,{recursive:true});
   fs.writeFileSync(path.join(output,'electron-smoke.json'),JSON.stringify(report,null,2));
   await new Promise(resolve=>setTimeout(resolve,1500));
   fs.writeFileSync(path.join(output,'electron-preview.png'),(await win.webContents.capturePage()).toPNG());
   app.quit();
  }
 }).catch(error=>{const message=String(error.message).replace(/token=[a-f0-9]+/gi,'token=[redacted]');const hint=error.code==='EADDRINUSE'?'本机 3211 端口已被其他程序占用。':'本机页面加载失败，请重新启动 WatchTV。';if(!process.argv.includes('--smoke-test'))dialog.showErrorBox('WatchTV 启动失败',`${hint}\n${message}`);console.error(message);app.exit(1);});
 app.on('window-all-closed',()=>app.quit());
 app.on('before-quit',event=>{if(service&&!closing){event.preventDefault();closing=true;service.close().finally(()=>app.quit());}});
}
