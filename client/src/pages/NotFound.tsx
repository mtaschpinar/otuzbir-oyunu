import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="game-bg min-h-screen w-full flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="text-7xl font-black text-primary mb-2">404</div>
        <h2 className="text-xl font-bold mb-3">Sayfa bulunamadı</h2>
        <p className="text-muted-foreground mb-8">
          Aradığın sayfa mevcut değil ya da oda kapanmış olabilir.
        </p>
        <Button size="lg" onClick={() => setLocation("/")}>
          <Home className="w-4 h-4 mr-2" />
          Ana Sayfaya Dön
        </Button>
      </div>
    </div>
  );
}
