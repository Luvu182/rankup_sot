import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string | ReactNode;
  actions?: ReactNode;
}

export default function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-white bg-gradient-to-r from-white via-white/90 to-white/80 bg-clip-text">
            {title}
          </h1>
          {description && (
            typeof description === 'string' ? (
              <p className="mt-1 text-sm text-white/60">{description}</p>
            ) : (
              <div className="mt-1 text-sm text-white/60">{description}</div>
            )
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}