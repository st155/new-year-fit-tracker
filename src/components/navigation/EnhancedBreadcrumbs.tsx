import { ReactNode } from "react"
import { useLocation } from "react-router-dom"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Home, ChevronRight } from "lucide-react"

const routeLabels: Record<string, string> = {
  '/': 'Home',
  '/dashboard': 'Dashboard',
  '/challenges': 'Challenges',
  '/challenges/create': 'Create Challenge',
  '/progress': 'Progress',
  '/profile': 'Profile',
  '/goals/create': 'Create Goal',
  '/fitness-data': 'Fitness Data',
  '/integrations': 'Integrations',
  '/trainer-dashboard': 'Trainer Dashboard'
}

export function EnhancedBreadcrumbs() {
  const location = useLocation()
  
  // Не показываем хлебные крошки на главной странице и auth
  if (location.pathname === '/' || location.pathname === '/auth') {
    return null
  }

  const pathSegments = location.pathname.split('/').filter(segment => segment !== '')
  
  const breadcrumbItems = pathSegments.map((segment, index) => {
    const path = '/' + pathSegments.slice(0, index + 1).join('/')
    const isLast = index === pathSegments.length - 1
    const label = routeLabels[path] || segment.charAt(0).toUpperCase() + segment.slice(1)
    
    return {
      path,
      label,
      isLast
    }
  })

  return (
    <div className="border-b bg-muted/30">
      <div className="container mx-auto px-4 py-3">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/" className="flex items-center gap-1 hover:text-primary transition-colors">
                <Home className="h-4 w-4" />
                <span className="sr-only">Home</span>
              </BreadcrumbLink>
            </BreadcrumbItem>
            
            {breadcrumbItems.map((item, index) => (
              <div key={item.path} className="flex items-center">
                <BreadcrumbSeparator>
                  <ChevronRight className="h-4 w-4" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  {item.isLast ? (
                    <BreadcrumbPage className="font-medium text-foreground">
                      {item.label}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink 
                      href={item.path} 
                      className="hover:text-primary transition-colors"
                    >
                      {item.label}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </div>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </div>
  )
}