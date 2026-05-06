(function() {
  var THEME_KEY = 'theme'
  var DEFAULT_THEME = 'sketch'

  function getSavedTheme() {
    try {
      var raw = localStorage.getItem(THEME_KEY)
      if (raw) {
        if (raw === 'default' || raw === 'glass') return DEFAULT_THEME
        return raw
      }
    } catch (e) {}
    return DEFAULT_THEME
  }

  var saved = getSavedTheme()
  document.documentElement.setAttribute('data-theme', saved)

  function buildCustomDropdown(select) {
    var options = Array.prototype.slice.call(select.options)
    var wrapper = document.createElement('div')
    wrapper.className = 'custom-dropdown'

    var trigger = document.createElement('button')
    trigger.type = 'button'
    trigger.className = 'custom-dropdown-trigger'
    trigger.textContent = select.options[select.selectedIndex]
      ? select.options[select.selectedIndex].text
      : ''

    var list = document.createElement('div')
    list.className = 'custom-dropdown-list'
    list.hidden = true

    options.forEach(function(opt) {
      var item = document.createElement('div')
      item.className = 'custom-dropdown-item'
      if (opt.value === select.value) item.classList.add('is-active')
      item.dataset.value = opt.value
      item.textContent = opt.text
      item.setAttribute('role', 'option')
      list.appendChild(item)
    })

    wrapper.appendChild(trigger)
    wrapper.appendChild(list)
    select.style.display = 'none'
    select.parentNode.insertBefore(wrapper, select)

    function close() {
      list.classList.remove('is-open')
      trigger.classList.remove('is-open')
      setTimeout(function() { list.hidden = true }, 180)
    }

    function open() {
      list.hidden = false
      requestAnimationFrame(function() {
        list.classList.add('is-open')
        trigger.classList.add('is-open')
        var active = list.querySelector('.is-active')
        if (active) active.scrollIntoView({ block: 'nearest' })
      })
    }

    function setValue(value) {
      select.value = value
      trigger.textContent = select.options[select.selectedIndex].text
      var items = list.querySelectorAll('.custom-dropdown-item')
      for (var i = 0; i < items.length; i++) {
        items[i].classList.toggle('is-active', items[i].dataset.value === value)
      }
      select.dispatchEvent(new Event('change'))
      close()
    }

    trigger.addEventListener('click', function(e) {
      e.stopPropagation()
      if (list.hidden) open(); else close()
    })

    list.addEventListener('click', function(e) {
      var item = e.target.closest('.custom-dropdown-item')
      if (item) setValue(item.dataset.value)
    })

    document.addEventListener('click', function(e) {
      if (!wrapper.contains(e.target)) close()
    })

    trigger.addEventListener('keydown', function(e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        if (list.hidden) { open(); return }
        var items = Array.prototype.slice.call(list.querySelectorAll('.custom-dropdown-item'))
        var current = list.querySelector('.is-active')
        var idx = items.indexOf(current)
        if (e.key === 'ArrowDown') idx = Math.min(idx + 1, items.length - 1)
        else idx = Math.max(idx - 1, 0)
        setValue(items[idx].dataset.value)
        open()
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        if (list.hidden) open(); else close()
      } else if (e.key === 'Escape') {
        close()
      }
    })

    select.addEventListener('change', function() {
      trigger.textContent = select.options[select.selectedIndex].text
      var items = list.querySelectorAll('.custom-dropdown-item')
      for (var i = 0; i < items.length; i++) {
        items[i].classList.toggle('is-active', items[i].dataset.value === select.value)
      }
    })

    select._updateCustomDropdown = function() {
      trigger.textContent = select.options[select.selectedIndex] ? select.options[select.selectedIndex].text : ''
      var items = list.querySelectorAll('.custom-dropdown-item')
      for (var i = 0; i < items.length; i++) {
        items[i].classList.toggle('is-active', items[i].dataset.value === select.value)
      }
    }
  }

  window.buildCustomDropdown = buildCustomDropdown

  function applyTheme(value) {
    document.documentElement.setAttribute('data-theme', value)
    try { localStorage.setItem(THEME_KEY, value) } catch (e) {}
  }

  function initThemeSwitcher() {
    var select = document.getElementById('theme-switcher')
    if (!select) return
    select.value = saved
    select.addEventListener('change', function() {
      applyTheme(this.value)
    })
    buildCustomDropdown(select)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initThemeSwitcher)
  } else {
    initThemeSwitcher()
  }
})()
