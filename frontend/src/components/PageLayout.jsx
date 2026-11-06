import React from 'react';
import Sidebar from './Sidebar';

function PageLayout({ children, showTopSpacer = true, showBottomSpacer = true, bottomSpacerHeight = 100 }) {
  return (
    <div className="min-h-[100svh] w-full overflow-x-clip bg-[hsla(210,40%,98%,1)]">
      <Sidebar />
      <div className="w-full md:pl-64">
        {showTopSpacer && (
          <div>
            <div className="h-[env(safe-area-inset-top,0px)]"></div>
            <div className="h-14"></div>
          </div>
        )}
        <main className="mx-auto w-full max-w-screen-2xl min-w-0 space-y-6 px-4 py-5 sm:px-6 md:py-6 lg:px-8 xl:px-10">
          {children}
        </main>
        {showBottomSpacer && (
          <div style={{ height: bottomSpacerHeight }}></div>
        )}
      </div>
    </div>
  );
}

export default PageLayout;
