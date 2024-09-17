const routes = [
    { url: 'two_way_bind.html', title: 'Local render + Two-way binding' },
    { url: 'renderlist.html', title: 'Render a datalist' }
];
const navbar = new LightMvvm({
    nodeName: 'navbar',
    data: [],
    templateContent: `
    <ul class="nav flex-column">
        {{#each this}}
            <li class="nav-item {{isActive}}">
            <a href="{{url}}" class="nav-link">{{title}}</a>
            </li>
        {{/each}}
    </ul>
`
});
// navbar.Render();
navbar.ReloadData(routes, navbar.proxy);
navbar.proxy.forEach((item, i) => {
    if (item.url == window.location.pathname.split('/')[4]) {
        navbar.proxy[i].isActive = 'active';
        document.querySelector('title').innerText = item.title;
    }
});
document.addEventListener('DOMContentLoaded', function () {
    const menuItems = document.querySelectorAll('.menu-item.has-children');
    menuItems.forEach(function (item) {
        item.addEventListener('click', function () {
            item.classList.toggle('open');
            const subMenu = item.querySelector('.sub-menu');
            subMenu.style.display = subMenu.style.display === 'block' ? 'none' : 'block';
        });
    });
});