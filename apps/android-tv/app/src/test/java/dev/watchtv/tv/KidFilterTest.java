package dev.watchtv.tv;
import org.junit.Test;
import static org.junit.Assert.*;
public class KidFilterTest {
 @Test public void matchesTheSelectedTitleOnly(){assertTrue(KidFilter.matches("猫和老鼠", "猫 和 老 鼠"));assertTrue(KidFilter.matches("ＡＢＣ", "abc"));assertFalse(KidFilter.matches("猫和老鼠", "猫和老鼠成人版"));assertFalse(KidFilter.matches("", ""));assertFalse(KidFilter.matches(null,"abc"));}
 @Test public void approvedSeriesIncludeSeasonsAndKnownFilms(){assertTrue(KidFilter.matches("小猪佩奇","小猪佩奇第一季"));assertTrue(KidFilter.matches("小猪佩奇","小猪佩奇过大年"));assertTrue(KidFilter.matches("汪汪队","汪汪队立大功第五季"));assertTrue(KidFilter.matches("汪汪队","汪汪队立大功大电影2：超能大冒险（原声版）"));assertTrue(KidFilter.matches("布鲁伊","布鲁伊第三季"));assertTrue(KidFilter.matches("拉布拉多警长","警长拉布拉多第一季"));assertTrue(KidFilter.matches("拉布拉多警长","安全警长啦咘啦哆第二季"));assertFalse(KidFilter.matches("汪汪队","汪汪队成人版"));assertFalse(KidFilter.matches("小猪佩奇","小猪佩奇成人版"));}
 @Test public void labradorUsesBothNames(){assertArrayEquals(new String[]{"拉布拉多警长","警长拉布拉多","安全警长啦咘啦哆","啦咘啦哆警长"},KidFilter.queries("拉布拉多警长"));assertArrayEquals(new String[]{"布鲁伊"},KidFilter.queries("布鲁伊"));}
}
