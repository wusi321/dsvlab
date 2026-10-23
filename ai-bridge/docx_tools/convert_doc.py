# convert_doc.py —— 用 Word COM 把 .doc 转成 .docx（或反向），原文件不动
# 用法: python convert_doc.py <源文件> <目标文件>
import sys, os, win32com.client as win32
import pythoncom

src, dst = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
fmt = 16 if dst.lower().endswith('.docx') else 0     # 16=docx(默认文档格式) 0=doc(97-2003)
pythoncom.CoInitialize()
word = win32.gencache.EnsureDispatch('Word.Application')
word.Visible = False
word.DisplayAlerts = 0
try:
    doc = word.Documents.Open(src, ReadOnly=False, AddToRecentFiles=False)
    doc.SaveAs2(dst, FileFormat=fmt)
    print('已转换: %s -> %s' % (src, dst))
    print('页数=%d 字数=%d 内嵌图形=%d 表格=%d' % (
        doc.ComputeStatistics(2), doc.ComputeStatistics(0), doc.InlineShapes.Count, doc.Tables.Count))
    doc.Close(False)
finally:
    word.Quit()
