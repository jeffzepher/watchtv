package dev.watchtv.tv;

import android.app.Activity;
import android.content.Intent;
import android.content.ActivityNotFoundException;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.widget.*;
import org.json.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

public final class MainActivity extends Activity {
 private static final int PICK=40, BG=Color.rgb(17,21,18), FG=Color.rgb(232,235,229), ACCENT=Color.rgb(199,237,156);
 private final ExecutorService workers=Executors.newSingleThreadExecutor(); private final ExecutorService searchWorkers=Executors.newFixedThreadPool(4);
 private LinearLayout root,content; private EditText query; private String currentQuery=""; private int catalogPage=0; private volatile long requestId=0; private VideoView player;
 private JSONArray sources=new JSONArray(); private String screen="home"; private JSONObject currentVideo; private String currentSource="";
 private int dp(float n){return (int)(n*getResources().getDisplayMetrics().density+0.5f);}
 @Override public void onCreate(Bundle state){super.onCreate(state);try(InputStream in=getAssets().open("sources.json")){sources=new JSONObject(read(in,1024*1024)).getJSONArray("sources");}catch(Exception e){toast("默认来源加载失败");}showHome();}
 @Override protected void onDestroy(){requestId++;workers.shutdownNow();searchWorkers.shutdownNow();super.onDestroy();}
 private TextView label(String text,int size){TextView t=new TextView(this);t.setText(text);t.setTextColor(FG);t.setTextSize(size);t.setPadding(dp(8),dp(8),dp(8),dp(8));return t;}
 private Button button(String text,Runnable action){Button b=new Button(this);b.setText(text);b.setTextSize(16);b.setTextColor(FG);b.setAllCaps(false);b.setBackgroundColor(Color.rgb(42,53,39));b.setFocusable(true);b.setOnFocusChangeListener((v,focused)->{b.setBackgroundColor(focused?ACCENT:Color.rgb(42,53,39));b.setTextColor(focused?BG:FG);});b.setOnClickListener(v->action.run());return b;}
 private void addButton(LinearLayout row,String text,Runnable action){Button b=button(text,action);LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-2,-2);p.setMargins(dp(5),dp(5),dp(5),dp(5));row.addView(b,p);}
 private void frame(String title){player=null;root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setBackgroundColor(BG);root.setPadding(dp(26),dp(14),dp(26),dp(14));root.addView(label("孟源TV  ·  "+title,24));ScrollView scroll=new ScrollView(this);scroll.setFillViewport(true);content=new LinearLayout(this);content.setOrientation(LinearLayout.VERTICAL);scroll.addView(content);root.addView(scroll,new LinearLayout.LayoutParams(-1,0,1));setContentView(root);}
 private int enabledCount(){int count=0;for(int i=0;i<sources.length();i++){JSONObject s=sources.optJSONObject(i);if(s!=null&&s.optBoolean("enabled",true))count++;}return count;}
 private void showHome(){
  long id=++requestId;screen="home";frame("儿童动画");
  content.addView(label("想看的动画",19));
  LinearLayout featuredRow=null;String[] featured={"小猪佩奇","斑马百科","汪汪队","布鲁伊","拉布拉多警长"};
  for(int i=0;i<featured.length;i++){if(i%3==0){featuredRow=new LinearLayout(this);content.addView(featuredRow);}String title=featured[i];addButton(featuredRow,title,()->startSearch(title));}
  content.addView(label("更多儿童动画 · 按评分排序",19));
  LinearLayout nav=new LinearLayout(this);TextView status=label("正在加载片单…",16);
  Button previous=button("上一页",()->{catalogPage=Math.max(0,catalogPage-1);showHome();});previous.setEnabled(catalogPage>0);nav.addView(previous);
  nav.addView(label("第 "+(catalogPage+1)+" 页",16));Button next=button("下一页",()->{catalogPage++;showHome();});next.setEnabled(false);nav.addView(next);content.addView(nav);content.addView(status);
  final int page=catalogPage;
  workers.execute(()->{try{
   String url=new Uri.Builder().scheme("https").authority("movie.douban.com").path("/j/new_search_subjects").appendQueryParameter("sort","S").appendQueryParameter("range","0,10").appendQueryParameter("tags","儿童,动画").appendQueryParameter("start",String.valueOf(page*20)).build().toString();
   JSONObject data=fetch(url);JSONArray list=data.optJSONArray("data");if(list==null)throw new IOException("片单暂时不可用，请稍后重试");
   runOnUiThread(()->{if(id!=requestId||!"home".equals(screen))return;status.setText(list.length()==0?"本页暂无动画片":"选择动画片后查看可播放线路");next.setEnabled(list.length()==20);
    for(int i=0;i<list.length();i++){JSONObject item=list.optJSONObject(i);if(item==null)continue;String title=item.optString("title").trim();if(title.isEmpty())continue;String rate=item.optString("rate");content.addView(button(title+(rate.isEmpty()?"":"  ★ "+rate),()->startSearch(title)));}
   });
  }catch(Exception e){runOnUiThread(()->{if(id==requestId&&"home".equals(screen)){status.setText("儿童动画片单暂时不可用，请检查网络后重试");addButton(content,"重新加载",this::showHome);}});}});
 }
 private static String read(InputStream in,int limit)throws IOException{if(in==null)throw new IOException("无法读取文件");ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] b=new byte[8192];int n,total=0;while((n=in.read(b))!=-1){total+=n;if(total>limit)throw new IOException("文件或响应过大");out.write(b,0,n);}return out.toString("UTF-8");}
 private static boolean publicHost(String host)throws IOException{for(InetAddress a:InetAddress.getAllByName(host)){byte[] b=a.getAddress();if(a.isAnyLocalAddress()||a.isLoopbackAddress()||a.isLinkLocalAddress()||a.isSiteLocalAddress()||a.isMulticastAddress())return false;if(b.length==4){int x=b[0]&255,y=b[1]&255;if((x==100&&y>=64&&y<=127)||(x==198&&(y==18||y==19))||x>=224)return false;}else if((b[0]&0xfe)==0xfc)return false;}return true;}
 private static JSONObject fetch(String url)throws Exception{if(!UrlPolicy.accept(url))throw new IOException("来源地址不受支持");URL u=new URL(url);if(!publicHost(u.getHost()))throw new IOException("来源解析到内网或保留地址");HttpURLConnection c=(HttpURLConnection)u.openConnection();c.setInstanceFollowRedirects(false);c.setConnectTimeout(10000);c.setReadTimeout(10000);c.setRequestProperty("User-Agent","Mozilla/5.0 WatchTV");try{if(c.getResponseCode()!=200)throw new IOException("来源返回 HTTP "+c.getResponseCode());try(InputStream in=c.getInputStream()){return new JSONObject(read(in,4*1024*1024));}}finally{c.disconnect();}}
 private void startSearch(String value){
  String term=value.trim();if(term.isEmpty()){toast("片名无效");return;}if(enabledCount()==0){toast("没有可用的默认来源");return;}
  currentQuery=term;long id=++requestId;screen="search";frame("查找："+term);
  LinearLayout bar=new LinearLayout(this);addButton(bar,"返回片单",()->{requestId++;showHome();});content.addView(bar);
  TextView status=label("正在查找可播放来源…",16);content.addView(status);
  AtomicInteger done=new AtomicInteger(),found=new AtomicInteger(),errors=new AtomicInteger();
  for(int i=0;i<sources.length();i++){
   JSONObject s=sources.optJSONObject(i);if(s==null||!s.optBoolean("enabled",true))continue;
   String src=s.optString("url"),name=s.optString("name");
   searchWorkers.execute(()->{if(id!=requestId)return;boolean succeeded=false;HashSet<String> seen=new HashSet<>();
   for(String word:KidFilter.queries(term)){if(id!=requestId)return;try{
    Uri.Builder u=Uri.parse(src).buildUpon().appendQueryParameter("ac","videolist").appendQueryParameter("wd",word).appendQueryParameter("pg","1");
    JSONArray list=fetch(u.build().toString()).optJSONArray("list");if(list==null)throw new IOException("无有效列表");succeeded=true;
    for(int j=0;j<Math.min(100,list.length())&&id==requestId;j++){
     JSONObject item=list.optJSONObject(j);if(item==null||!KidFilter.matches(term,item.optString("vod_name")))continue;
     String unique=item.optString("vod_id",item.optString("vod_name"));if(!seen.add(unique))continue;
     if(found.incrementAndGet()>200)break;
     runOnUiThread(()->{if(id!=requestId||!"search".equals(screen))return;content.addView(button(item.optString("vod_name")+"  ·  "+name+"  "+item.optString("vod_remarks"),()->openVideo(item,name,src)));});
    }
   }catch(Exception ignored){} }
   if(!succeeded)errors.incrementAndGet();
   int d=done.incrementAndGet(),f=Math.min(200,found.get()),err=errors.get();
   runOnUiThread(()->{if(id==requestId&&"search".equals(screen))status.setText("已完成 "+d+"/"+enabledCount()+" 个来源，"+(f==0&&d==enabledCount()?"暂未找到":"找到 "+f+" 条结果")+(f>=200?"（已达显示上限）":"")+(err>0?"，"+err+" 个来源不可用":""));});
  });
  }
 }
 private void openVideo(JSONObject item,String source,String sourceUrl){
  if(!item.optString("vod_play_url").isEmpty()){showVideo(item,source);return;}
  String vodId=item.optString("vod_id");if(vodId.isEmpty()){showVideo(item,source);return;}
  long id=++requestId;screen="loading";frame(item.optString("vod_name"));content.addView(label("正在加载剧集…",18));addButton(content,"返回搜索",()->startSearch(currentQuery));
  workers.execute(()->{try{String u=Uri.parse(sourceUrl).buildUpon().appendQueryParameter("ac","videolist").appendQueryParameter("ids",vodId).build().toString();JSONArray list=fetch(u).optJSONArray("list");JSONObject detail=list!=null?list.optJSONObject(0):null;runOnUiThread(()->{if(id==requestId&&"loading".equals(screen)){if(detail==null||!KidFilter.matches(currentQuery,detail.optString("vod_name"))){toast("来源未返回匹配的影片");showVideo(item,source);}else showVideo(detail,source);}});}catch(Exception e){runOnUiThread(()->{if(id==requestId&&"loading".equals(screen)){toast("加载剧集失败，请重试或切换来源");showVideo(item,source);}});}});
 }
 private void showVideo(JSONObject item,String source){screen="detail";currentVideo=item;currentSource=source;frame(item.optString("vod_name"));LinearLayout nav=new LinearLayout(this);addButton(nav,"返回搜索",()->startSearch(currentQuery));addButton(nav,"返回片单",this::showHome);content.addView(nav);content.addView(label("来源："+source+"   "+item.optString("vod_remarks"),16));String[] names=item.optString("vod_play_from").split("\\$\\$\\$",-1);String[] lines=item.optString("vod_play_url").split("\\$\\$\\$",-1);int added=0;for(int i=0;i<lines.length;i++){String[] eps=lines[i].split("#");boolean heading=false;for(int j=0;j<eps.length;j++){String e=eps[j];int split=e.indexOf('$');String title=split>=0?e.substring(0,split):"第 "+(j+1)+" 集";String url=split>=0?e.substring(split+1):e;if(!UrlPolicy.accept(url)||!url.matches("(?i).*\\.(m3u8|mp4|m4v)(\\?.*)?$"))continue;if(!heading){content.addView(label(i<names.length&&!names[i].isEmpty()?names[i]:"线路 "+(i+1),19));heading=true;}final String playable=url;content.addView(button(title,()->play(playable)));added++;}}if(added==0)content.addView(label("没有可直接播放的 HLS 或 MP4 线路，请尝试其他来源。",17));}
 private void play(String url){screen="player";root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setBackgroundColor(Color.BLACK);root.addView(label(currentVideo.optString("vod_name")+"  ·  "+currentSource,18));player=new VideoView(this);root.addView(player,new LinearLayout.LayoutParams(-1,0,1));LinearLayout controls=new LinearLayout(this);controls.setGravity(Gravity.CENTER);addButton(controls,"播放 / 暂停",()->{if(player.isPlaying())player.pause();else player.start();});addButton(controls,"后退 10 秒",()->player.seekTo(Math.max(0,player.getCurrentPosition()-10000)));addButton(controls,"前进 10 秒",()->player.seekTo(player.getCurrentPosition()+10000));addButton(controls,"返回剧集",()->{player.stopPlayback();showVideo(currentVideo,currentSource);});root.addView(controls);setContentView(root);player.setOnErrorListener((mp,what,extra)->{toast("播放失败，请检查网络或切换来源、线路");return true;});long id=++requestId;workers.execute(()->{try{if(!publicHost(new URL(url).getHost()))throw new IOException("播放地址解析到内网或保留地址");runOnUiThread(()->{if(id==requestId&&"player".equals(screen)&&player!=null){player.setVideoURI(Uri.parse(url));player.start();}});}catch(Exception e){runOnUiThread(()->{if(id==requestId&&"player".equals(screen))toast("播放地址无法访问，请切换来源或线路");});}});controls.getChildAt(0).requestFocus();}
 private void toast(String s){Toast.makeText(this,s,Toast.LENGTH_LONG).show();}
 @Override public void onBackPressed(){requestId++;if("player".equals(screen)){if(player!=null)player.stopPlayback();showVideo(currentVideo,currentSource);}else if("detail".equals(screen))startSearch(currentQuery);else if(!"home".equals(screen))showHome();else super.onBackPressed();}
}
