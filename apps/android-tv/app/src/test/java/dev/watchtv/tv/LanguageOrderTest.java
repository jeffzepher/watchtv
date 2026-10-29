package dev.watchtv.tv;
import org.junit.Test;
import static org.junit.Assert.*;
public class LanguageOrderTest {
 @Test public void englishFirstThenUnknownThenChinese(){assertEquals(0,LanguageOrder.rank("小猪佩奇第一季英文版","英语",""));assertEquals(0,LanguageOrder.rank("小猪佩奇第八季","英语","已完结"));assertEquals(1,LanguageOrder.rank("小猪佩奇第八季","英语 / 汉语普通话",""));assertEquals(1,LanguageOrder.rank("小猪佩奇第一季","",""));assertEquals(2,LanguageOrder.rank("小猪佩奇第十季中文版","英语 / 汉语普通话",""));assertEquals(2,LanguageOrder.rank("小猪佩奇第九季","国语",""));}
 @Test public void theReportedEpisodeIsDeprioritizedWithoutTreatingOtherSourcesAsVerified(){assertTrue(LanguageOrder.reported("小猪佩奇","量子资源","小猪佩奇 第二季"));assertFalse(LanguageOrder.reported("小猪佩奇","非凡资源","小猪佩奇 第二季"));assertFalse(LanguageOrder.reported("小猪佩奇","量子资源","小猪佩奇 第一季"));}
 @Test public void selectedEnglishAndChineseSeasonsRemainAllowed(){assertTrue(KidFilter.matches("小猪佩奇","小猪佩奇 第一季 英文版"));assertTrue(KidFilter.matches("小猪佩奇","小猪佩奇 第十季 中文版"));assertFalse(KidFilter.matches("小猪佩奇","小猪佩奇 成人版"));}
}
