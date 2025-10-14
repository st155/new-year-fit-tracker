import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// Минимальное приложение с табами для изоляции проблемы React hooks
export default function App() {
  React.useEffect(() => {
    // Проверка монтирования (для отладки хука)
    // console.log("App mounted");
  }, []);

  return (
    <main className="mx-auto max-w-2xl p-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold">Мои табы</h1>
        <p className="text-muted-foreground">Проверьте, что переключение работает без ошибок.</p>
      </header>

      <Tabs defaultValue="tab1" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tab1">Сегодня</TabsTrigger>
          <TabsTrigger value="tab2">Неделя</TabsTrigger>
          <TabsTrigger value="tab3">Месяц</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">
          <section className="mt-4">
            <h2 className="text-lg font-medium">Сегодня</h2>
            <p className="text-muted-foreground">Краткий обзор за день.</p>
          </section>
        </TabsContent>
        <TabsContent value="tab2">
          <section className="mt-4">
            <h2 className="text-lg font-medium">Неделя</h2>
            <p className="text-muted-foreground">Тренды за неделю.</p>
          </section>
        </TabsContent>
        <TabsContent value="tab3">
          <section className="mt-4">
            <h2 className="text-lg font-medium">Месяц</h2>
            <p className="text-muted-foreground">Динамика за месяц.</p>
          </section>
        </TabsContent>
      </Tabs>
    </main>
  );
}
