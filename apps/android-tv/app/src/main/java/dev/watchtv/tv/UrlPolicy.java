package dev.watchtv.tv;
import java.net.URI;
public final class UrlPolicy {
 public static boolean accept(String input){
  try { if(input==null||input.length()>4096)return false; URI u=new URI(input);String h=u.getHost();int p=u.getPort();
   if(h==null||u.getUserInfo()!=null||u.getFragment()!=null||!("https".equalsIgnoreCase(u.getScheme())||"http".equalsIgnoreCase(u.getScheme()))||(p!=-1&&p!=80&&p!=443))return false;
   if(h.equalsIgnoreCase("localhost")||h.endsWith(".local")||h.indexOf(':')>=0)return false;
   if(h.matches("[0-9.]+")){String[] x=h.split("\\.");if(x.length!=4)return false;int a=Integer.parseInt(x[0]),b=Integer.parseInt(x[1]); if(a==0||a==10||a==127||a>=224||(a==169&&b==254)||(a==172&&b>=16&&b<=31)||(a==192&&b==168)||(a==100&&b>=64&&b<=127)||(a==198&&(b==18||b==19)))return false;}
   return true;
  }catch(Exception e){return false;}
 }
}
