function loadMenus() {
    const token = localStorage.getItem('token');
    // Token yoksa işlem yapma (index.html zaten login'e atıyor)
    if (!token) return Promise.reject('No token');

    return fetch('/api/menus', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(response => response.json())
        .then(menus => {
            const menuContainer = document.getElementById('menuContainer');
            if (!menuContainer) return;
            
            menuContainer.innerHTML = '';
            const fragment = document.createDocumentFragment();
            const currentPath = window.location.pathname; // Aktif sayfa kontrolü için

            // Menüleri ID'ye göre haritala
            const menuMap = {};
            menus.forEach(menu => {
                menu.children = [];
                menuMap[menu.id] = menu;
            });

            // Hiyerarşiyi oluştur (Parent-Child ilişkisi)
            const rootMenus = [];
            menus.forEach(menu => {
                let parentId = menu.parent_id;
                
                // Veri temizliği: parent_id 'null' stringi veya null/undefined ise 0 kabul et
                if (parentId === 'null' || parentId === null || parentId === undefined) {
                    parentId = 0;
                } else {
                    parentId = parseInt(parentId);
                }

                // Parent ID geçerli bir sayı ise ve haritada varsa child olarak ekle
                if (parentId > 0 && menuMap[parentId]) {
                    menuMap[parentId].children.push(menu);
                } else {
                    rootMenus.push(menu);
                }
            });

            // Ana menüleri kendi içinde sırala
            rootMenus.sort((a, b) => (a.order || 0) - (b.order || 0));

            // Her menünün alt menülerini kendi içinde sırala
            menus.forEach(menu => {
                if (menu.children.length > 1) {
                    menu.children.sort((a, b) => (a.order || 0) - (b.order || 0));
                }
            });

            // HTML oluştur ve ekle
            rootMenus.forEach(menu => {
                const li = document.createElement('li');
                li.className = 'nav-item';

                if (menu.children.length > 0) {
                    li.classList.add('dropdown');
                    
                    // Alt menülerden biri aktifse ana menüyü de aktif yap
                    const isChildActive = menu.children.some(child => child.url === currentPath);
                    const activeClass = isChildActive ? 'active' : '';

                    // Dropdown Toggle Linki
                    const a = document.createElement('a');
                    a.className = `nav-link dropdown-toggle ${activeClass} ${isChildActive ? 'show' : ''}`;
                    a.href = '#';
                    a.setAttribute('role', 'button');
                    a.setAttribute('aria-expanded', isChildActive ? 'true' : 'false');

                    // Manuel Toggle (Bootstrap çakışmalarını önlemek için)
                    a.onclick = (e) => {
                        e.preventDefault();
                        const dropdownMenu = li.querySelector('.dropdown-menu');
                        if (dropdownMenu) {
                            const isShown = dropdownMenu.classList.contains('show');
                            dropdownMenu.classList.toggle('show');
                            a.classList.toggle('show');
                            a.setAttribute('aria-expanded', !isShown);
                        }
                    };

                    // İkon ve Başlık
                    const iconClass = menu.icon ? menu.icon : 'fa-circle';
                    a.innerHTML = `
                        <span class="nav-link-icon d-md-none d-lg-inline-block">
                            <i class="fas ${iconClass} me-2"></i>
                        </span>
                    `;
                    const titleSpan = document.createElement('span');
                    titleSpan.className = 'nav-link-title';
                    titleSpan.textContent = menu.title; // XSS Koruması için textContent
                    a.appendChild(titleSpan);
                    li.appendChild(a);

                    // Dropdown Menü İçeriği
                    const dropdownMenu = document.createElement('div');
                    // Eğer alt menü aktifse dropdown açık gelsin
                    dropdownMenu.className = `dropdown-menu ${isChildActive ? 'show' : ''}`;
                    const columns = document.createElement('div');
                    columns.className = 'dropdown-menu-columns';
                    const column = document.createElement('div');
                    column.className = 'dropdown-menu-column';
                    
                    menu.children.forEach(child => {
                        const childActive = child.url === currentPath ? 'active' : '';
                        const childA = document.createElement('a');
                        childA.className = `dropdown-item ${childActive}`;
                        childA.href = child.url;
                        // handleNavigation desteği
                        childA.setAttribute('onclick', `handleNavigation(event, '${child.url}')`);
                        childA.textContent = child.title; // XSS Koruması
                        column.appendChild(childA);
                    });

                    columns.appendChild(column);
                    dropdownMenu.appendChild(columns);
                    li.appendChild(dropdownMenu);
                } else {
                    const isActive = menu.url === currentPath ? 'active' : '';
                    const a = document.createElement('a');
                    a.className = `nav-link ${isActive}`;
                    a.href = menu.url;
                    // handleNavigation desteği
                    a.setAttribute('onclick', `handleNavigation(event, '${menu.url}')`);
                    
                    const iconClass = menu.icon ? menu.icon : 'fa-circle';
                    a.innerHTML = `
                        <span class="nav-link-icon d-md-none d-lg-inline-block">
                            <i class="fas ${iconClass} me-2"></i>
                        </span>
                    `;
                    
                    const titleSpan = document.createElement('span');
                    titleSpan.className = 'nav-link-title';
                    titleSpan.textContent = menu.title;
                    a.appendChild(titleSpan);
                    
                    li.appendChild(a);
                }
                fragment.appendChild(li);
            });
            menuContainer.appendChild(fragment);
        })
        .catch(err => console.error('Menü yüklenemedi:', err));
}