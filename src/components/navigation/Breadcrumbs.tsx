import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

const routeLabels: Record<string, string> = {
  "/": "Главная",
  "/dashboard": "Дашборд",
  "/challenges": "Челленджи",
  "/challenges/create": "Создать челлендж",
  "/progress": "Прогресс",
  "/profile": "Профиль",
  "/goals/create": "Создать цель",
  "/fitness-data": "Фитнес данные",
  "/integrations": "Интеграции",
  "/trainer-dashboard": "Управление клиентами",
};

export function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);

  // Не показываем breadcrumbs на главной странице
  if (location.pathname === "/") {
    return null;
  }

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "Главная", href: "/" },
  ];

  let currentPath = "";
  pathnames.forEach((name, index) => {
    currentPath += `/${name}`;
    const isLast = index === pathnames.length - 1;
    
    // Специальная обработка для динамических путей
    let label = routeLabels[currentPath];
    
    if (!label) {
      // Если это ID (UUID или число), пропускаем или используем родительский контекст
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(name) || /^\d+$/.test(name)) {
        const parentPath = currentPath.replace(`/${name}`, "");
        const parentLabel = routeLabels[parentPath];
        if (parentLabel === "Челленджи") {
          label = "Детали челленджа";
        } else if (parentPath.includes("/goals")) {
          label = "Редактировать цель";
        }
      } else {
        // Капитализируем название
        label = name.charAt(0).toUpperCase() + name.slice(1);
      }
    }

    breadcrumbItems.push({
      label,
      href: isLast ? undefined : currentPath,
    });
  });

  return (
    <div className="border-b bg-muted/10">
      <div className="container py-3">
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbItems.map((item, index) => (
              <div key={index} className="flex items-center">
                {index > 0 && (
                  <BreadcrumbSeparator>
                    <ChevronRight className="h-4 w-4" />
                  </BreadcrumbSeparator>
                )}
                <BreadcrumbItem>
                  {item.href ? (
                    <BreadcrumbLink asChild>
                      <Link to={item.href} className="flex items-center gap-1">
                        {index === 0 && <Home className="h-4 w-4" />}
                        {item.label}
                      </Link>
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage className="flex items-center gap-1">
                      {index === 0 && <Home className="h-4 w-4" />}
                      {item.label}
                    </BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </div>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </div>
  );
}