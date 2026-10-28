package dev.watchtv.tv;
import java.text.Normalizer;
import java.util.Locale;
public final class KidFilter {
 private static String normal(String value){return value==null?"":Normalizer.normalize(value,Normalizer.Form.NFKC).replaceAll("\\s+","").toLowerCase(Locale.ROOT);}
 private static boolean sequel(String rest){return rest.isEmpty()||rest.matches("(?:第?[0-9零一二三四五六七八九十百]+季|第?[0-9零一二三四五六七八九十百]+部)(?:\\((?:普通话|国语|中文版|原声版|普通话版)\\))?");}
 public static boolean matches(String selected,String candidate){
  String x=normal(selected),v=normal(candidate);if(x.isEmpty())return false;if(x.equals(v))return true;
  if(x.equals("小猪佩奇"))return v.startsWith(x)&&(sequel(v.substring(x.length()))||v.equals(x+"过大年"));
  if(x.equals("布鲁伊")||x.equals("斑马百科"))return v.startsWith(x)&&sequel(v.substring(x.length()));
  if(x.equals("拉布拉多警长")){for(String prefix:new String[]{"拉布拉多警长","警长拉布拉多","安全警长啦咘啦哆","啦咘啦哆警长"})if(v.startsWith(prefix)&&sequel(v.substring(prefix.length())))return true;return false;}
  if(x.equals("汪汪队")){String prefix="汪汪队立大功";if(!v.startsWith(prefix))return false;String rest=v.substring(prefix.length());return sequel(rest)||rest.matches("(?:大电影(?:2:超能大冒险)?|之超能救援|之勇敢大营救)(?:\\((?:普通话版|原声版)\\))?");}
  return false;
 }
 public static String[] queries(String selected){return "拉布拉多警长".equals(selected)?new String[]{"拉布拉多警长","警长拉布拉多","安全警长啦咘啦哆","啦咘啦哆警长"}:new String[]{selected};}
}
