import { useLocation, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";

const NotFound = () => {
  const { t } = useTranslation('notFound');
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">{t('title')}</h1>
        <p className="mb-4 text-xl text-muted-foreground">{t('message')}</p>
        <Link to="/" className="text-primary underline hover:text-primary/80">
          {t('backHome')}
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
