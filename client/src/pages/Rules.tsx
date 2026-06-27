import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

const RULES: { title: string; text: string }[] = [
  {
    title: "Amaç",
    text: "31, 1'den 31'e kadar olan sayıları kullanan bir eleme oyunudur. 2 ile 15 kişi oynayabilir. Amaç son tek oyuncu olarak kalmamaktır; en son hayatta kalan tek oyuncu ceza alır (kaybeder).",
  },
  {
    title: "Oda Kurma",
    text: "Bir oyuncu oda oluşturur ve ekranda çıkan 4 haneli kodu diğer oyunculara gönderir. Diğer oyuncular bu kodu girerek odaya katılır.",
  },
  {
    title: "Gizli Sayı",
    text: "Oyun başlamadan önce herkes gizlice 1-31 arasında bir sayı seçer ve onaylar. Seçilen sayıyı kimse göremez ve onaylandıktan sonra değiştirilemez.",
  },
  {
    title: "Sıra ve Sayı Söyleme",
    text: "Sıra sırayla her oyuncuya gelir. Sırası gelen oyuncu 1-31 arasında bir sayı söyler; ancak kendi gizli sayısını söyleyemez.",
  },
  {
    title: "Eleme",
    text: "Söylenen sayı başka bir oyuncunun gizli sayısıyla eşleşirse o oyuncu elenir. Eşleşme yoksa sıra bir sonraki oyuncuya geçer.",
  },
  {
    title: "Sayı Tahtası",
    text: "Söylenen sayılar tahtada işaretlenir. Kırmızı çarpı: söylenmiş ama kimseyi çıkaramamış sayı. Yeşil çarpı: bir oyuncuyu elemiş sayı.",
  },
  {
    title: "İzleyici Modu",
    text: "Elenen oyuncular oyundan çıkmaz; izleyici olarak oyunu takip etmeye devam edebilir.",
  },
];

export default function Rules() {
  const [, setLocation] = useLocation();
  return (
    <div className="game-bg min-h-screen w-full">
      <div className="max-w-lg mx-auto px-4 py-6">
        <Button variant="ghost" size="sm" className="mb-4 -ml-2" onClick={() => setLocation("/")}>
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Geri
        </Button>
        <h1 className="text-2xl font-black mb-6">Nasıl Oynanır?</h1>
        <div className="space-y-4">
          {RULES.map((r, i) => (
            <div key={i} className="bg-card/60 backdrop-blur border border-border rounded-2xl p-4">
              <h2 className="font-bold text-primary mb-1.5">{r.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{r.text}</p>
            </div>
          ))}
        </div>
        <Button className="w-full mt-6 h-12 font-bold" onClick={() => setLocation("/")}>
          Oynamaya Başla
        </Button>
      </div>
    </div>
  );
}
