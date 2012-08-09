(function($) {
    $.fn.cssPages = function(options) {
        
        options = $.extend({
            items: '> *',
            itemsPerPage: 5,
            currentClass: 'current',
            firstPage: 1,
            next: '.next',
            prev: '.prev'
        }, options);
        
        var getPaging = function(page) {
            return {
                offset: 'n + ' + (options.itemsPerPage * page + 1),
                limit: '-n + ' + options.itemsPerPage * (page + 1)
            }
        },
                
        getQuery = function(page) {
            var p = getPaging(page);
            return 'li:nth-child(' + p.offset + '):nth-child(' + p.limit + ')';
        },
            
        changePage = function($items, page) {
            $items.removeClass(options.currentClass)
                  .filter(getQuery(page)).addClass(options.currentClass);
        };
        
        return this.each(function() {
            var page = options.firstPage - 1,
                $items = $(this).find(options.items);
            
            $(options.next).bind('click.paginator', function() {
                if ((page + 1) * options.itemsPerPage >= $items.length) return;
                changePage($items, ++page);
            });
            
            $(options.prev).bind('click.paginator', function() {
                if (page == 0) return;
                changePage($items, --page);
            });
            
            changePage($items, page);
        });
    };
})(jQuery);