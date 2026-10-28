package dev.watchtv.tv;
import org.junit.Test;
import static org.junit.Assert.*;
public class UrlPolicyTest {
 @Test public void acceptsOnlyStandardHttpUrls(){assertTrue(UrlPolicy.accept("https://example.com/api"));assertTrue(UrlPolicy.accept("http://example.com/a"));assertFalse(UrlPolicy.accept("file:///etc/passwd"));assertFalse(UrlPolicy.accept("http://user:pass@example.com"));assertFalse(UrlPolicy.accept("http://example.com:8080/a"));assertFalse(UrlPolicy.accept("http://127.0.0.1/a"));assertFalse(UrlPolicy.accept("http://192.168.1.1/a"));}
}
