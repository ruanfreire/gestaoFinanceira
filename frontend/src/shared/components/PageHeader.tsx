import { ReactNode } from "react";
import PageMeta from "@ui/components/common/PageMeta";
import PageBreadcrumb from "@ui/components/common/PageBreadCrumb";

type PageHeaderProps = {
  title: string;
  description?: string;
  metaTitle?: string;
  metaDescription?: string;
  actions?: ReactNode;
  breadcrumb?: boolean;
};

export function PageHeader({
  title,
  description,
  metaTitle,
  metaDescription,
  actions,
  breadcrumb = false,
}: PageHeaderProps) {
  return (
    <>
      <PageMeta
        title={metaTitle ?? `${title} | Gestão Financeira`}
        description={metaDescription ?? description ?? title}
      />
      {breadcrumb && <PageBreadcrumb pageTitle={title} />}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </>
  );
}
