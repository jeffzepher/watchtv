package dev.watchtv.tv;
import java.util.Locale;
public final class LanguageOrder {
 public static boolean reported(String selected,String source,String title){return "小猪佩奇".equals(selected)&&"量子资源".equals(source)&&KidFilter.matches("小猪佩奇第二季",title);}
 public static int rank(String title,String language,String note){
  String names=((title==null?"":title)+" "+(note==null?"":note)).toLowerCase(Locale.ROOT);
  if(names.contains("中文版")||names.contains("国语版")||names.contains("普通话版")||names.contains("国语"))return 2;
  if(names.contains("英文版")||names.contains("英语版")||names.contains("english"))return 0;
  String lang=language==null?"":language.toLowerCase(Locale.ROOT);
  boolean english=lang.contains("英语")||lang.contains("英文")||lang.contains("english");
  boolean chinese=lang.contains("国语")||lang.contains("中文")||lang.contains("汉语")||lang.contains("普通话")||lang.contains("chinese");
  return english&&!chinese?0:chinese&&!english?2:1;
 }
}
