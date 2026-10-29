package dev.watchtv.tv;

import android.app.Activity;
import android.content.Intent;
import android.content.ActivityNotFoundException;
import android.graphics.Color;
import android.graphics.BitmapFactory;
import android.graphics.drawable.GradientDrawable;
import android.os.Handler;
import android.os.Looper;
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
 private final ExecutorService images=Executors.newFixedThreadPool(3); private final Handler controlsHandler=new Handler(Looper.getMainLooper()); private LinearLayout playerControls; private final ExecutorService workers=Executors.newSingleThreadExecutor(); private final ExecutorService searchWorkers=Executors.newFixedThreadPool(4);
 private LinearLayout root,content; private EditText query; private String currentQuery=""; private int catalogPage=0; private volatile long requestId=0; private VideoView player;
 private JSONArray sources=new JSONArray(); private String screen="home"; private JSONObject currentVideo; private String currentSource="";
 private int dp(float n){return (int)(n*getResources().getDisplayMetrics().density+0.5f);}
 @Override public void onCreate(Bundle state){super.onCreate(state);getWindow().getDecorView().setSystemUiVisibility(5894|1024|512);try(InputStream in=getAssets().open("sources.json")){sources=new JSONObject(read(in,1024*1024)).getJSONArray("sources");}catch(Exception e){toast("默认来源加载失败");}showHome();}
 @Override protected void onDestroy(){requestId++;controlsHandler.removeCallbacksAndMessages(null);workers.shutdownNow();images.shutdownNow();searchWorkers.shutdownNow();super.onDestroy();}
 private TextView label(String text,int size){TextView t=new TextView(this);t.setText(text);t.setTextColor(FG);t.setTextSize(size);t.setPadding(dp(8),dp(8),dp(8),dp(8));return t;}
 private Button button(String text,Runnable action){Button b=new Button(this);b.setText(text);b.setTextSize(16);b.setTextColor(FG);b.setAllCaps(false);b.setBackgroundColor(Color.rgb(42,53,39));b.setFocusable(true);b.setOnFocusChangeListener((v,focused)->{b.setBackgroundColor(focused?ACCENT:Color.rgb(42,53,39));b.setTextColor(focused?BG:FG);});b.setOnClickListener(v->action.run());return b;}
 private void addGridButton(GridLayout grid,String text,int width,Runnable action){Button b=button(text,action);b.setMaxLines(2);b.setEllipsize(android.text.TextUtils.TruncateAt.END);GridLayout.LayoutParams p=new GridLayout.LayoutParams();p.width=dp(width);p.height=dp(58);p.setMargins(dp(5),dp(5),dp(5),dp(5));grid.addView(b,p);}
 private void addButton(LinearLayout row,String text,Runnable action){Button b=button(text,action);LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-2,-2);p.setMargins(dp(5),dp(5),dp(5),dp(5));row.addView(b,p);}
 private void frame(String title){player=null;root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setBackgroundColor(BG);root.setPadding(dp(26),dp(14),dp(26),dp(14));root.addView(label("孟源TV  ·  "+title,24));ScrollView scroll=new ScrollView(this);scroll.setFillViewport(true);content=new LinearLayout(this);content.setOrientation(LinearLayout.VERTICAL);scroll.addView(content);root.addView(scroll,new LinearLayout.LayoutParams(-1,0,1));setContentView(root);}
 private int enabledCount(){int count=0;for(int i=0;i<sources.length();i++){JSONObject s=sources.optJSONObject(i);if(s!=null&&s.optBoolean("enabled",true))count++;}return count;}
 private void showHome(){
  long id=++requestId;screen="home";frame("儿童动画");
  content.addView(label("想看的动画",22));
  HorizontalScrollView strip=new HorizontalScrollView(this);strip.setHorizontalScrollBarEnabled(false);LinearLayout featuredRow=new LinearLayout(this);strip.addView(featuredRow);content.addView(strip);
  String[] featured={"小猪佩奇","斑马百科","汪汪队","布鲁伊","拉布拉多警长"};
  for(String title:featured){LinearLayout card=posterCard(title,"",()->startSearch(title));featuredRow.addView(card);if(!"斑马百科".equals(title))loadFeaturedPoster(card,title,id);}
  content.addView(label("更多儿童动画 · 按评分排序",19));
  LinearLayout nav=new LinearLayout(this);TextView status=label("正在加载片单…",16);
  Button previous=button("上一页",()->{catalogPage=Math.max(0,catalogPage-1);showHome();});previous.setEnabled(catalogPage>0);nav.addView(previous);
  nav.addView(label("第 "+(catalogPage+1)+" 页",16));Button next=button("下一页",()->{catalogPage++;showHome();});next.setEnabled(false);nav.addView(next);content.addView(nav);content.addView(status);
  final int page=catalogPage;
  workers.execute(()->{try{
   String url=new Uri.Builder().scheme("https").authority("movie.douban.com").path("/j/new_search_subjects").appendQueryParameter("sort","S").appendQueryParameter("range","0,10").appendQueryParameter("tags","儿童,动画").appendQueryParameter("start",String.valueOf(page*20)).build().toString();
   JSONObject data=fetch(url);JSONArray list=data.optJSONArray("data");if(list==null)throw new IOException("片单暂时不可用，请稍后重试");
   runOnUiThread(()->{if(id!=requestId||!"home".equals(screen))return;status.setText(list.length()==0?"本页暂无动画片":"选择动画片后查看可播放线路");next.setEnabled(list.length()==20);
    GridLayout grid=new GridLayout(this);grid.setColumnCount(5);content.addView(grid);
    for(int i=0;i<list.length();i++){JSONObject item=list.optJSONObject(i);if(item==null)continue;String title=item.optString("title").trim();if(title.isEmpty())continue;String rate=item.optString("rate");LinearLayout card=posterCard(title,rate,()->startSearch(title));grid.addView(card);loadPoster(card,item.optString("cover"),id,"home");}
   });
  }catch(Exception e){runOnUiThread(()->{if(id==requestId&&"home".equals(screen)){status.setText("儿童动画片单暂时不可用，请检查网络后重试");addButton(content,"重新加载",this::showHome);}});}});
 }
 private LinearLayout posterCard(String title,String rate,Runnable action){
  LinearLayout card=new LinearLayout(this);card.setOrientation(LinearLayout.VERTICAL);card.setPadding(dp(6),dp(6),dp(6),dp(6));card.setFocusable(true);card.setClickable(true);card.setContentDescription(title+(rate.isEmpty()?"":" 评分 "+rate));
  GradientDrawable background=new GradientDrawable(GradientDrawable.Orientation.TL_BR,new int[]{Color.rgb(46,69,49),Color.rgb(25,34,29)});background.setCornerRadius(dp(9));
  FrameLayout poster=new FrameLayout(this);poster.setBackground(background);TextView placeholder=label(title.substring(0,1),46);placeholder.setGravity(Gravity.CENTER);placeholder.setTextColor(ACCENT);poster.addView(placeholder,new FrameLayout.LayoutParams(-1,-1));ImageView image=new ImageView(this);image.setScaleType(ImageView.ScaleType.CENTER_CROP);image.setImageResource("斑马百科".equals(title)?R.drawable.kid_zebra:R.drawable.kid_placeholder);poster.addView(image,new FrameLayout.LayoutParams(-1,-1));
  card.addView(poster,new LinearLayout.LayoutParams(dp(148),dp(210)));TextView name=label(title,16);name.setSingleLine(true);name.setEllipsize(android.text.TextUtils.TruncateAt.END);card.addView(name,new LinearLayout.LayoutParams(dp(148),dp(46)));card.addView(label(rate.isEmpty()?"查看动画":"★ "+rate,13));card.setTag(image);
  card.setOnClickListener(v->action.run());card.setOnFocusChangeListener((v,focused)->{card.setBackgroundColor(focused?Color.rgb(73,100,63):Color.TRANSPARENT);card.setScaleX(focused?1.04f:1f);card.setScaleY(focused?1.04f:1f);});return card;
 }
 private android.graphics.Bitmap sourceBitmap(String address)throws IOException{
  for(int redirects=0;redirects<=2;redirects++){
   if(!UrlPolicy.accept(address))throw new IOException("海报地址无效");URL url=new URL(address);if(!publicHost(url.getHost()))throw new IOException("海报地址不可用");
   HttpURLConnection c=(HttpURLConnection)url.openConnection();c.setInstanceFollowRedirects(false);c.setConnectTimeout(5000);c.setReadTimeout(5000);c.setRequestProperty("User-Agent","Mozilla/5.0 WatchTV");
   try{int code=c.getResponseCode();if(code>=300&&code<400&&c.getHeaderField("Location")!=null){address=new URL(url,c.getHeaderField("Location")).toString();continue;}if(code!=200)throw new IOException("海报不可用");
    try(InputStream in=c.getInputStream();ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] buf=new byte[8192];int n,size=0;while((n=in.read(buf))!=-1){size+=n;if(size>2*1024*1024)throw new IOException("海报过大");out.write(buf,0,n);}byte[] bytes=out.toByteArray();BitmapFactory.Options opts=new BitmapFactory.Options();opts.inSampleSize=4;return BitmapFactory.decodeByteArray(bytes,0,bytes.length,opts);}
   }finally{c.disconnect();}
  }throw new IOException("海报重定向过多");
 }
 private void loadFeaturedPoster(LinearLayout card,String title,long id){
  images.execute(()->{String term="拉布拉多警长".equals(title)?"安全警长啦咘啦哆":title;
   for(int i=0;i<Math.min(4,sources.length())&&id==requestId;i++){JSONObject source=sources.optJSONObject(i);if(source==null)continue;try{
    String api=Uri.parse(source.optString("url")).buildUpon().appendQueryParameter("ac","videolist").appendQueryParameter("wd",term).appendQueryParameter("pg","1").build().toString();JSONArray list=fetch(api).optJSONArray("list");if(list==null)continue;
    for(int j=0;j<Math.min(30,list.length())&&id==requestId;j++){JSONObject item=list.optJSONObject(j);if(item==null||!KidFilter.matches(title,item.optString("vod_name")))continue;String pic=item.optString("vod_pic","");if(pic.isEmpty())continue;try{android.graphics.Bitmap bitmap=sourceBitmap(pic);if(bitmap!=null){runOnUiThread(()->{if(id==requestId&&"home".equals(screen))((ImageView)card.getTag()).setImageBitmap(bitmap);});return;}}catch(Exception ignored){}}
   }catch(Exception ignored){}}
   if(id==requestId)loadSuggestionPoster(card,title,id,"home");
  });
 }
 private void loadPoster(LinearLayout card,String url,long id,String expectedScreen){
  if(url==null||url.isEmpty())return;images.execute(()->{try{URL u=new URL(url);if(!"https".equals(u.getProtocol())||!u.getHost().matches("img[0-9]*\\.doubanio\\.com")||!publicHost(u.getHost()))return;HttpURLConnection c=(HttpURLConnection)u.openConnection();c.setInstanceFollowRedirects(false);c.setConnectTimeout(5000);c.setReadTimeout(5000);c.setRequestProperty("Referer","https://movie.douban.com/");try{if(c.getResponseCode()!=200)return;try(InputStream in=c.getInputStream()){BitmapFactory.Options opts=new BitmapFactory.Options();opts.inSampleSize=2;android.graphics.Bitmap bitmap=BitmapFactory.decodeStream(in,null,opts);if(bitmap!=null)runOnUiThread(()->{if(id==requestId&&expectedScreen.equals(screen))((ImageView)card.getTag()).setImageBitmap(bitmap);});}}finally{c.disconnect();}}catch(Exception ignored){}});
 }
 private void loadSuggestionPoster(LinearLayout card,String title,long id,String expectedScreen){
  images.execute(()->{try{String word=title.equals("拉布拉多警长")?"安全警长啦咘啦哆":title;String u=new Uri.Builder().scheme("https").authority("movie.douban.com").path("/j/subject_suggest").appendQueryParameter("q",word).build().toString();URL target=new URL(u);if(!publicHost(target.getHost()))return;HttpURLConnection c=(HttpURLConnection)target.openConnection();c.setInstanceFollowRedirects(false);c.setConnectTimeout(5000);c.setReadTimeout(5000);c.setRequestProperty("User-Agent","Mozilla/5.0 WatchTV");try{if(c.getResponseCode()!=200)return;JSONArray values=new JSONArray(read(c.getInputStream(),1024*1024));for(int i=0;i<values.length();i++){JSONObject item=values.optJSONObject(i);if(item!=null&&KidFilter.matches(title,item.optString("title"))){loadPoster(card,item.optString("img"),id,expectedScreen);break;}}}finally{c.disconnect();}}catch(Exception ignored){}});
 }
 private static String read(InputStream in,int limit)throws IOException{if(in==null)throw new IOException("无法读取文件");ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] b=new byte[8192];int n,total=0;while((n=in.read(b))!=-1){total+=n;if(total>limit)throw new IOException("文件或响应过大");out.write(b,0,n);}return out.toString("UTF-8");}
 private static boolean publicHost(String host)throws IOException{for(InetAddress a:InetAddress.getAllByName(host)){byte[] b=a.getAddress();if(a.isAnyLocalAddress()||a.isLoopbackAddress()||a.isLinkLocalAddress()||a.isSiteLocalAddress()||a.isMulticastAddress())return false;if(b.length==4){int x=b[0]&255,y=b[1]&255;if((x==100&&y>=64&&y<=127)||(x==198&&(y==18||y==19))||x>=224)return false;}else if((b[0]&0xfe)==0xfc)return false;}return true;}
 private static JSONObject fetch(String url)throws Exception{if(!UrlPolicy.accept(url))throw new IOException("来源地址不受支持");URL u=new URL(url);if(!publicHost(u.getHost()))throw new IOException("来源解析到内网或保留地址");HttpURLConnection c=(HttpURLConnection)u.openConnection();c.setInstanceFollowRedirects(false);c.setConnectTimeout(10000);c.setReadTimeout(10000);c.setRequestProperty("User-Agent","Mozilla/5.0 WatchTV");try{if(c.getResponseCode()!=200)throw new IOException("来源返回 HTTP "+c.getResponseCode());try(InputStream in=c.getInputStream()){return new JSONObject(read(in,4*1024*1024));}}finally{c.disconnect();}}
 private void startSearch(String value){
  String term=value.trim();if(term.isEmpty()){toast("片名无效");return;}if(enabledCount()==0){toast("没有可用的默认来源");return;}
  currentQuery=term;long id=++requestId;screen="search";frame("查找："+term);
  LinearLayout bar=new LinearLayout(this);addButton(bar,"返回片单",()->{requestId++;showHome();});content.addView(bar);
  TextView status=label("正在查找可播放来源…",16);content.addView(status);
  final GridLayout[] languageGroups=new GridLayout[3];final GridLayout resultGrid=new GridLayout(this);resultGrid.setColumnCount(3);
  if("小猪佩奇".equals(term)){String[] headings={"来源标注英语（音轨未核验）","语言未明确 / 混合","中文或反馈非英文"};for(int g=0;g<3;g++){content.addView(label(headings[g],18));GridLayout grid=new GridLayout(this);grid.setColumnCount(3);content.addView(grid);languageGroups[g]=grid;}}else content.addView(resultGrid);
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
     String lang=item.optString("vod_lang","").trim();if(lang.length()>40)lang=lang.substring(0,40);final String langLabel=lang;
     int rank=isReportedNonEnglish(name,item)?2:LanguageOrder.rank(item.optString("vod_name"),langLabel,item.optString("vod_remarks"));
     runOnUiThread(()->{if(id!=requestId||!"search".equals(screen))return;GridLayout target=languageGroups[rank]==null?resultGrid:languageGroups[rank];addGridButton(target,item.optString("vod_name")+"  ·  "+name+(isReportedNonEnglish(name,item)?(LanguageOrder.reported(currentQuery,name,item.optString("vod_name"))?"  ·  第1集反馈非英文（待确认）":"  ·  已标记非英文"):langLabel.isEmpty()?"":"  ·  来源标注 "+langLabel)+"  "+item.optString("vod_remarks"),350,()->openVideo(item,name,src));});
    }
   }catch(Exception ignored){} }
   if(!succeeded)errors.incrementAndGet();
   int d=done.incrementAndGet(),f=Math.min(200,found.get()),err=errors.get();
   runOnUiThread(()->{if(id==requestId&&"search".equals(screen))status.setText("已完成 "+d+"/"+enabledCount()+" 个来源，"+(f==0&&d==enabledCount()?"暂未找到":"找到 "+f+" 条结果")+(f>=200?"（已达显示上限）":"")+(err>0?"，"+err+" 个来源不可用":""));});
  });
  }
 }
 private String languageFeedbackKey(String source,JSONObject item){String identity=item.optString("vod_id",item.optString("vod_name"));return "not_english:"+source+":"+identity;}
 private boolean isReportedNonEnglish(String source,JSONObject item){
  if(!"小猪佩奇".equals(currentQuery))return false;
  return getPreferences(0).getBoolean(languageFeedbackKey(source,item),false)||LanguageOrder.reported(currentQuery,source,item.optString("vod_name"));
 }
 private void openVideo(JSONObject item,String source,String sourceUrl){
  if(!item.optString("vod_play_url").isEmpty()){showVideo(item,source);return;}
  String vodId=item.optString("vod_id");if(vodId.isEmpty()){showVideo(item,source);return;}
  long id=++requestId;screen="loading";frame(item.optString("vod_name"));content.addView(label("正在加载剧集…",18));addButton(content,"返回搜索",()->startSearch(currentQuery));
  workers.execute(()->{try{String u=Uri.parse(sourceUrl).buildUpon().appendQueryParameter("ac","videolist").appendQueryParameter("ids",vodId).build().toString();JSONArray list=fetch(u).optJSONArray("list");JSONObject detail=list!=null?list.optJSONObject(0):null;runOnUiThread(()->{if(id==requestId&&"loading".equals(screen)){if(detail==null||!KidFilter.matches(currentQuery,detail.optString("vod_name"))){toast("来源未返回匹配的影片");showVideo(item,source);}else showVideo(detail,source);}});}catch(Exception e){runOnUiThread(()->{if(id==requestId&&"loading".equals(screen)){toast("加载剧集失败，请重试或切换来源");showVideo(item,source);}});}});
 }
 private void showVideo(JSONObject item,String source){screen="detail";currentVideo=item;currentSource=source;frame(item.optString("vod_name"));LinearLayout nav=new LinearLayout(this);addButton(nav,"返回片单",this::showHome);content.addView(nav);content.addView(label("来源："+source+"   "+item.optString("vod_remarks"),16));if("小猪佩奇".equals(currentQuery)){content.addView(label("语言为来源标注，实际音轨可能不同",15));addButton(nav,"标记为非英文",()->{getPreferences(0).edit().putBoolean(languageFeedbackKey(source,item),true).apply();toast("已标记，下次查找会排到后面");});}String[] names=item.optString("vod_play_from").split("\\$\\$\\$",-1);String[] lines=item.optString("vod_play_url").split("\\$\\$\\$",-1);int added=0;for(int i=0;i<lines.length;i++){String[] eps=lines[i].split("#");boolean heading=false;GridLayout episodeGrid=new GridLayout(this);episodeGrid.setColumnCount(6);for(int j=0;j<eps.length;j++){String e=eps[j];int split=e.indexOf('$');String title=split>=0?e.substring(0,split):"第 "+(j+1)+" 集";String url=split>=0?e.substring(split+1):e;if(!UrlPolicy.accept(url)||!url.matches("(?i).*\\.(m3u8|mp4|m4v)(\\?.*)?$"))continue;if(!heading){content.addView(label(i<names.length&&!names[i].isEmpty()?names[i]:"线路 "+(i+1),19));content.addView(episodeGrid);heading=true;}final String playable=url;addGridButton(episodeGrid,title,150,()->play(playable));added++;}}if(added==0)content.addView(label("没有可直接播放的 HLS 或 MP4 线路，请尝试其他来源。",17));}
 private void showPlayerControls(){if(playerControls==null)return;playerControls.setVisibility(View.VISIBLE);controlsHandler.removeCallbacksAndMessages(null);controlsHandler.postDelayed(()->{if(playerControls!=null&&"player".equals(screen))playerControls.setVisibility(View.GONE);},5000);}
 private void play(String url){screen="player";FrameLayout stage=new FrameLayout(this);stage.setBackgroundColor(Color.BLACK);player=new VideoView(this);stage.addView(player,new FrameLayout.LayoutParams(-1,-1));
  playerControls=new LinearLayout(this);playerControls.setGravity(Gravity.CENTER);playerControls.setBackgroundColor(0xdd111511);FrameLayout.LayoutParams controlParams=new FrameLayout.LayoutParams(-1,dp(72),Gravity.BOTTOM);stage.addView(playerControls,controlParams);
  addButton(playerControls,"播放 / 暂停",()->{if(player.isPlaying())player.pause();else player.start();showPlayerControls();});addButton(playerControls,"后退 10 秒",()->{player.seekTo(Math.max(0,player.getCurrentPosition()-10000));showPlayerControls();});addButton(playerControls,"前进 10 秒",()->{player.seekTo(player.getCurrentPosition()+10000);showPlayerControls();});addButton(playerControls,"返回剧集",()->{player.stopPlayback();showVideo(currentVideo,currentSource);});setContentView(stage);getWindow().getDecorView().setSystemUiVisibility(5894|1024|512);
  player.setOnErrorListener((mp,what,extra)->{toast("播放失败，请检查网络或切换来源、线路");showPlayerControls();return true;});long id=++requestId;workers.execute(()->{try{if(!publicHost(new URL(url).getHost()))throw new IOException("播放地址解析到内网或保留地址");runOnUiThread(()->{if(id==requestId&&"player".equals(screen)&&player!=null){player.setVideoURI(Uri.parse(url));player.start();}});}catch(Exception e){runOnUiThread(()->{if(id==requestId&&"player".equals(screen)){toast("播放地址无法访问，请切换来源或线路");showPlayerControls();}});}});playerControls.getChildAt(0).requestFocus();showPlayerControls();
 }
 @Override public boolean dispatchKeyEvent(KeyEvent event){if("player".equals(screen)&&event.getAction()==KeyEvent.ACTION_DOWN){int key=event.getKeyCode();if(key==KeyEvent.KEYCODE_DPAD_CENTER||key==KeyEvent.KEYCODE_ENTER||key==KeyEvent.KEYCODE_DPAD_LEFT||key==KeyEvent.KEYCODE_DPAD_RIGHT||key==KeyEvent.KEYCODE_DPAD_UP||key==KeyEvent.KEYCODE_DPAD_DOWN){if(playerControls!=null&&playerControls.getVisibility()!=View.VISIBLE){showPlayerControls();playerControls.getChildAt(0).requestFocus();return true;}showPlayerControls();}}return super.dispatchKeyEvent(event);}
 private void toast(String s){Toast.makeText(this,s,Toast.LENGTH_LONG).show();}
 @Override public void onBackPressed(){requestId++;if("player".equals(screen)){if(player!=null)player.stopPlayback();showVideo(currentVideo,currentSource);}else if("detail".equals(screen))showHome();else if(!"home".equals(screen))showHome();else super.onBackPressed();}
}
