(function(){
    var DESC = "desc";
    var ASC = "asc";
    function isNullOrUndefined(obj){
        if (obj === undefined || obj === null) {
            return true;
        }
        return false;
    }
    function newId(){
        var seedId =  new Date().getTime();
        return seedId++;
    }
    function endsWith(str,suffix){
        if (!str || !suffix || typeof str !== "string") {
            return false;
        }
        return str.indexOf(suffix, str.length - suffix.length) !== -1;
    }
    function getCSSDim(ele){
        var dim={};
        if(ele.style.width){
            dim = {width:ele.style.width,height:ele.style.height};
        }
        if(ele.currentStyle){
            dim ={width:ele.currentStyle.width,height:ele.currentStyle.height}
        };
        if(document.defaultView&&document.defaultView.getComputedStyle){
            var style = document.defaultView.getComputedStyle(ele,'');
            dim = {width:style.getPropertyValue('width'),height:style.getPropertyValue('height')};
        }
        dim.width = parseInt(dim.width.replace('px',''))||0;
        dim.height = parseInt(dim.height.replace('px',''))||0;
        return dim;
    }
    //升序排列type＝asc 降序为desc
    function sortByCode(code,data,type){
        if(data&&data.length>0){
            data.sort(compare);
        }
        type = type||"asc";
        function compare(a,b){
            if (a[code] < b[code])
                return type=='asc'?-1:1;
            if (a[code] > b[code])
                return type=='asc'?1:-1;
            return 0;
        }
    }
    function gridRow(rowIndex,grid,data){
        var ngRow = {
            data:data,
            rowIndex:rowIndex,
            top:rowIndex*grid.rowHeight,
            left:0,
            height:grid.rowHeight,
            rowClass:(rowIndex%2==1)?'even':'odd'
        };
        return ngRow;
    }
    function gridColumn(conf,grid){
        var self = this,
            colDef = conf;
        self.clicks = 0;
        self.delay = 500;
        self.timer = null;
        self.width = colDef.width;
        self.groupIndex = 0;
        self.label = conf.label;
        self.code = conf.code;
        self.minWidth = !colDef.minWidth?grid.colWidth:colDef.minWidth;
        self.maxWidth = !colDef.maxWidth?9000:colDef.maxWidth;
        self.heightRowHeight = grid.rowHeight;
        self.index = colDef.index;
        self.cellClass = colDef.cellClass||'';
        self.sortable = grid.sortable;
        self.pinnable = grid.pinnable;
        self.pinned = colDef.pinned||false;
        if(grid.sortable){
            self.sortable = isNullOrUndefined(colDef.sortable)||colDef.sortable;
        }
        if(grid.pinnable){
            self.pinned = !isNullOrUndefined(colDef.pinned)||colDef.pinned;
            if(self.pinned){
                self.cellClass+=" pinned";
            }
        }
        if(grid.resizable){
            self.resizable = !isNullOrUndefined(colDef.resizable)||colDef.resizable;
        }
        self.headerClass = colDef.headerClass;
    }
    //TODO select 选中  单选 多选模式 返回选择的数据等
    //TODO 样式 挑一个好看的样式 替换过去 就ok了
    this.mtGrid = {
        publish:{
            //是否排序
            sortable:true,
            //是否可固定
            pinnable:false,
            //是否可以自适应页宽
            resizable:true,
            //显示几行
            rowCount:10,
            //默认行高
            rowHeight:30,
            //默认列宽
            colWidth:100
        },
        created:function(){
            this.data=[];
            this.model ={};
            this.elementDims = {
                scrollW: 0,
                scrollH: 0,
                rowIndexCellW: 25,
                rowSelectedCellW: 25,
                rootMaxW: 0,
                rootMaxH: 0
            };
            this.maxCanvasHt = 0;
            this.columns =[];
            this.scope.grid = this;

        },
        ready:function(){
            //初始化 注册事件的地方
            window.addEventListener('resize',function(e){
                //更新界面结构

            });
            //为grid 添加动态样式
            this.gridId = 'grid'+newId();
            this.$.grid.className+=' '+this.gridId.toString();
            var self = this;
            this.$.viewport.outerDim = function(){
                return getCSSDim(self.$.viewport);
            }
            this.$.viewport.addEventListener("scroll",this.scrollHandler.bind(this));
            window.addEventListener('resize',this.windowResize.bind(this));
            this.scope.windowThrottle = null;
        },
        dataChanged:function(){
            //渲染界面数据
            var rows = [];
            for(var i = 0;i<this.data.length;i++){
                rows.push(new gridRow(i,this,this.data[i]));
            }
            this.rows = rows;
        },
        modelChanged:function(){
            //model发生改变 渲染model数据
            //构建所有的column
            this.idField = this.model.idField;
            this.sortable = this.model.sortable||this.sortable;
            this.pinnable = this.model.pinnable||this.pinnable;
            this.resizable = this.model.resizable||this.resizable;
            var cols = this.model.columns;
            var col;
            for(var i =0;i<cols.length;i++){
                col = cols[i];
                col.index = i;
                this.columns.push(new gridColumn(col,this));
            }
            //渲染界面
            this.rebuildGrid();

        },
        rebuildGrid:function(){
            this.updateGridLayout();
            this.scope.configureColumnWidths(this);
            this.scope.adjustScrollLeft(this.$.viewport.scrollLeft);
            this.scope.buildStyles(this);
        },
        updateGridLayout:function(){
            var scrollTop = this.$.grid.scrollTop;
            var dim= getCSSDim(this);
            this.elementDims.rootMaxH = dim.height;
            this.elementDims.rootMaxW = dim.width;
            if(this.hidden){
                this.hidden = false;
                dim= getCSSDim(this);
                this.elementDims.rootMaxH = dim.height;
                this.elementDims.rootMaxW = dim.width;
                this.hidden = true;
            }
            this.outerWidth = this.elementDims.rootMaxW;
            this.outerHeight = this.elementDims.rootMaxH;
            //保持垂直的滚动位置
            this.scope.adjustScrollTop(scrollTop,true);
        },
        scrollHandler:function(event){
            var scrollLeft = event.target.scrollLeft,
                scrollTop = event.target.scrollTop;
            if(this.$.headerContainer){
                this.$.headerContainer.scrollLeft = scrollLeft;
            }
            this.scope.adjustScrollLeft(scrollLeft);
            this.scope.adjustScrollTop(scrollTop);
            this.scope.prevScrollTop = scrollTop;
            this.scope.prevScrollLeft = scrollLeft;
            this.scope.isMouseWheelActive = false;
        },

        //单机排序之后的回调
        sortCallback:function(column){
            var list = [];
            for(var i=0;i<this.data.length;i++){
                list.push(this.data[i]);
            }
            sortByCode(column.code,list,column.sortDirection);
            this.data = list;
        },
        windowResize:function(){
            clearTimeout(this.scope.windowThrottle);
            var self = this;
            this.scope.windowThrottle = setTimeout(function() {
                //in function for IE8 compatibility
                self.rebuildGrid();
            }, 100);
        },
        scope:{
            prevScrollIndex:0,
            prevScrollTop:0,
            regexCache:{},
            scrollH:0,
            scrollW:0,
            adjustScrollTop:function(scrollTop,force){
                if(self.prevScrollTop===scrollTop&&!force){
                    return;
                }
                var rowIndex = Math.floor(scrollTop/this.grid.rowHeight);
                self.prevScrollIndex = rowIndex;
                self.prevScrollTop = scrollTop;
                this.refreshDomSizes();
            },
            adjustScrollLeft:function(scrollLeft){
                var colwidths = 0,
                    totalLeft = 0,
                    x = this.grid.columns.length,
                    newCols = []
                var r = 0;
                for(var i =0; i<x;i++){
                    var col = this.grid.columns[i];
                    if(col){
                        var w = col.width+colwidths;
                        if(col.pinned){
                            newCols.push(col);
                            var newLeft = i>0?(scrollLeft+totalLeft):scrollLeft;
                            // 设置左坐标位置
                            this.setColLeft(col, newLeft);
                            totalLeft +=col.width;
                        }else{
                            if(w>=scrollLeft){
                                if(colwidths<=scrollLeft+this.rootDim.outerWidth){
                                    newCols.push(col);
                                }
                            }
                        }
                        colwidths += col.width;
                    }
                }
                this.renderedColumns = newCols;

            },
            refreshDomSizes:function(){
                var dim = {outerHeight:null,outerWidth:null};
                dim.outerHeight = this.grid.elementDims.rootMaxH;
                dim.outerWidth = this.grid.elementDims.rootMaxW;
                this.rootDim = dim;
            },
            setColLeft:function(col,left){
                if(this.grid.styleText){
                    var regex = this.regexCache[col.index];
                    if(!regex){
                        regex = this.regexCache[col.index] = new RegExp(".col" + col.index + " { width:[0-9]+px; left:[0-9]+px");
                    }
                    var css = grid.styleText.replace(regex, ".col" + col.index + " { width:" + col.width + "px; left:" + left + "px");
                    this.setStyleText(this.grid,css);
                }
            },
            totalRowWidth:function(grid){
                var totalWidth = 0,
                    cols = grid.columns;
                for(var i=0;i<cols.length;i++){
                    totalWidth+=cols[i].width;
                }
                return totalWidth;
            },
            topPanelHeight:function(){
                return this.grid.rowHeight;
            },
            viewportDimHeight:function(){
                return Math.max(0, this.grid.outerHeight - this.topPanelHeight() - 2);
            },
            configureColumnWidths:function(grid){
                var asterisksArray = [],
                    percentArray = [],
                    asteriskNum = 0,
                    totalWidth = 0;
                var indexMap = {};
                var gridCol,i=0;
                for(i =0;i<grid.columns.length;i++){
                    gridCol = grid.columns[i];
                    if(!isNullOrUndefined(gridCol.index)){
                        var origIndex = gridCol.index;
                        if(grid.showCheckbox){
                            if(gridCol.index===0){
                                totalWidth+=25;
                            }
                            origIndex--;
                        }
                        indexMap[origIndex] = i;
                    }
                }
                var colDef;
                for(i=0;i<grid.model.columns.length;i++){
                    colDef = grid.model.columns[indexMap[i]];
                    colDef.index = i;
                    var isPercent = false,t;
                    if(isNullOrUndefined(colDef.width)){
                        colDef.width='*';
                    }else{
                        isPercent = isNaN(colDef.width)?endsWith(colDef.width,"%"):false;
                        t = isPercent?colDef.width:parseInt(colDef.width,10);
                    }
                    if(isNaN(t)&&!grid.hasUserChangedGridColumnWidths){
                        t = colDef.width;
                        if(t==="auto"){
                            gridCol.width = grid.colWidth;
                            totalWidth+=gridCol.width;
                            var temp = gridCol;
                            //TODO
//                            $scope.$on('$destroy', $scope.$on("ngGridEventData", function () {
//                                self.resizeOnData(temp);
//                            }));

                        }else if(t.indexOf('*')!==-1){
                            asteriskNum+= t.length;
                            asterisksArray.push(colDef);
                        }else if(isPercent){
                            percentArray.push(colDef);
                        }else { // we can't parse the width so lets throw an error.
                            throw "unable to parse column width, use percentage (\"10%\",\"20%\", etc...) or \"*\" to use remaining width of grid";
                        }
                    }else{
                        totalWidth += gridCol.width = parseInt(gridCol.width, 10);
                    }
                }
                //％
                if(percentArray.length>0){
                    var percentWidth = 0;
                    var hiddenPercent = 0;
                    for(i=0;i<percentArray.length;i++){
                        colDef = percentArray[i];
                        var col = grid.columns[indexMap[colDef.index]];
                        var percent = parseFloat(colDef.width)/100;
                        percentWidth+=percent;
                        hiddenPercent+=percent;
                    }
                    var percentWidthUsed = percentWidth - hiddenPercent;
                    for(i=0;i<percentArray.length;i++){
                        colDef = percentArray[i];
                        var col = grid.columns[indexMap[colDef.index]];
                        if(hiddenPercent>0){
                            percent = percent/percentWidthUsed;
                        }else{
                            percent = percent/percentWidth;
                        }
                        var pixelsForPercentBasedWidth = grid.outerWidth * percentWidth;
                        col.width = pixelsForPercentBasedWidth * percent;
                        totalWidth += col.width;
                    }
                }
                // auto
                if(asterisksArray.length>0){
                    var remainingWidth = grid.outerWidth-totalWidth;
                    if(grid.maxCanvasHt>this.viewportDimHeight()){
                        remainingWidth -= this.scrollW;
                    }
                    var asteriskVal = Math.floor(remainingWidth/asteriskNum);
                    if(asteriskVal<grid.colWidth){
                        asteriskVal = grid.colWidth;
                    }
                    for(i=0;i<asterisksArray.length;i++){
                        colDef = asterisksArray[i];
                        var col = grid.columns[indexMap[colDef.index]];
                        col.width = asteriskVal*colDef.width.length;
                        totalWidth+=col.width;
                        var isLast = (i === (asterisksArray.length - 1));
                        //if last asterisk and doesn't fill width of grid, add the difference
                        if(isLast && totalWidth < grid.outerWidth){
                            var gridWidthDifference = grid.outerWidth - totalWidth;
                            if(self.maxCanvasHt > this.viewportDimHeight()){
                                gridWidthDifference -= this.scrollW;
                            }
                            col.width += gridWidthDifference;
                        }
                    }
                }
            },
            buildStyles:function(grid){
                var rowHeight = grid.rowHeight,
                    gridId = grid.gridId,
                    css,
                    cols = grid.columns,
                    sumWidth = 0;
                var trw = this.totalRowWidth(grid);
                css = "."+gridId+' .canvas { width:'+trw+'px; }' +
                    '.'+gridId+' .row { width:'+trw+'px;}' +
                    '.'+gridId+'{ width:'+grid.outerWidth+'px; height:'+grid.outerHeight+'px;}'+
                    '.'+gridId+' .headerScroller { width:'+trw+this.scrollH+'px;}' +
                    '.'+gridId+' .topPanel{ width:'+grid.outerWidth+'px; height:'+grid.rowHeight+'px;}'+
                    '.'+gridId+' .headerContainer { width:'+grid.outerWidth+'px;height:'+grid.rowHeight+'px;}'+
                    '.'+gridId+' .verticalBar { height:'+grid.rowHeight+'px;}'+
                    '.'+gridId+' .viewport { width:'+grid.outerWidth+'px; height:'+(grid.outerHeight-grid.rowHeight-2)+'px;}';
                for(var i=0;i<cols.length;i++){
                    var col = cols[i];
                    css+='.'+gridId+' .col'+i+' { width:'+col.width+'px; left:'+sumWidth+'px; height:'+rowHeight+'px }' +
                        '.'+gridId+' .colt'+i+' { width:'+col.width+'px; height:'+grid.rowHeight+'px;}';
                    sumWidth+=col.width;
                }
                this.setStyleText(grid,css);
                this.adjustScrollLeft(grid.$.viewport.scrollLeft);
            },
            setStyleText:function(grid,css){
                var style = grid.styleSheet,
                    gridId = grid.gridId,
                    doc = document;
                if(style){
                    style = grid.shadowRoot.querySelector("#"+gridId);
                }
                if(!style){
                    style = doc.createElement('style');
                    style.type='text/css';
                    style.id=gridId;
                    grid.shadowRoot.appendChild(style);
                }
                if(style.styleSheet&&!style.sheet){
                    style.styleSheet.cssText = css;
                }else{
                    style.innerHTML = css;
                }
                grid.styleSheet = style;
                grid.styleText = css;
            }

        },
        //拖拽
        gripOnMouseDown:function(event){
            var target = event.target.parentNode;
            var gridColumn = this.columns[parseInt(target.getAttribute('column-index'),10)];
            if(gridColumn){
                this.isColumnResizing = true;
                if(event.ctrlKey&&!gridColumn.pinned){
                    return;
                }
                this.moveGridColumn = gridColumn;
                gridColumn.startMousePosition = event.clientX;
                gridColumn.origWidth = gridColumn.width;
                this.addEventListener('mousemove',this.onMouseMove);
            }
        },
        onMouseMove:function(event){
            var gridColumn = this.moveGridColumn;
            var diff = event.clientX-gridColumn.startMousePosition;
            var newWidth = diff+gridColumn.origWidth;
            gridColumn.width = (newWidth < gridColumn.minWidth ? gridColumn.minWidth : (newWidth > gridColumn.maxWidth ? gridColumn.maxWidth : newWidth));
            this.hasUserChangedGridColumnWidths = true;
            //去更新样式吧
            this.scope.buildStyles(grid);
        },
        gripOnMouseUp:function(event){
            this.removeEventListener('mousemove',this.onMouseMove);
            this.removeEventListener('mouseup',this.gripOnMouseUp);
            this.isColumnResizing = false;
        },
        sortHandler:function(event){
            var target = event.target.parentNode;
            var gridColumn = this.columns[parseInt(target.getAttribute('column-index'),10)];
            if(gridColumn){
                if(!gridColumn.sortable){
                    return true;
                }
                var dir = gridColumn.sortDirection ===ASC?DESC:ASC;
                gridColumn.sortDirection = dir;
                var sortButtonUp = target.querySelector('.sortButtonUp');
                var sortButtonDown = target.querySelector('.sortButtonDown');
                if(gridColumn.sortDirection == ASC){
                    sortButtonUp.className = sortButtonUp.className.replace('hide','');
                    if(sortButtonDown.className.indexOf('hide')==-1){
                        sortButtonDown.className = sortButtonDown.className.trim()+' hide';
                    }
                }else{
                    sortButtonDown.className = sortButtonDown.className.replace('hide','');
                    if(sortButtonUp.className.indexOf('hide')==-1){
                        sortButtonUp.className = sortButtonUp.className.trim()+' hide';
                    }
                }
                this.sortCallback(gridColumn);
            }

        },
        togglePin:function(event){
            var target = event.target.parentNode;
            var gridColumn = this.columns[parseInt(target.getAttribute('column-index'),10)];
            if(gridColumn){
                gridColumn.pinned=!gridColumn.pinned;
                var cells = this.shadowRoot.querySelectorAll('.col'+gridColumn.index);
                if(cells){
                    var cell;
                    for(var i = 0;i<cells.length;i++){
                        cell = cells[i];
                        if(cell.className.indexOf('pinned')==-1){
                            if(gridColumn.pinned==true){
                                cell.className = cell.className+' pinned';
                            }
                        }else{
                            if(gridColumn.pinned==false){
                                cell.className = cell.className.replace('pinned','');
                                cell.className = cell.className.trim();
                            }
                        }
                    }
                }

            }
        }

    };
}());